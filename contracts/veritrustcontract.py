# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
import re
from genlayer import *


class VeriTrustAI(gl.Contract):
    """
    VeriTrust Prediction Market & Escrow Protocol (Native GEN Token Edition)
    Users bet actual native GEN tokens on factual claims. Validators natively fetch from multiple sources,
    clean the HTML internally, reach consensus, and automatically payout real GEN tokens to winners.
    Losers' stakes are locked/burned in the contract natively.
    """

    markets: TreeMap[bigint, str]
    next_market_id: bigint

    def __init__(self):
        self.next_market_id = 1

    @gl.public.write
    def create_market(self, claim: str, resolution_urls: list[str]) -> int:
        """Opens a new prediction market/escrow."""
        if not resolution_urls or len(resolution_urls) == 0:
            raise Exception("Must provide at least one resolution URL")
        if len(resolution_urls) > 3:
            raise Exception("Maximum of 3 resolution URLs allowed to avoid timeout")
            
        market_id = self.next_market_id
        self.next_market_id += 1
        
        market_data = {
            "id": market_id,
            "creator": str(gl.message.sender_address),
            "claim": claim,
            "resolution_urls": resolution_urls,
            "status": "OPEN", 
            "verdict": None,
            "pool_yes": 0,
            "pool_no": 0,
            "bets": [] 
        }
        
        self.markets[market_id] = json.dumps(market_data)
        return market_id

    @gl.public.write.payable
    def bet(self, market_id: int, prediction_is_true: bool) -> bool:
        """Locks native GEN tokens into the market escrow pool."""
        val = gl.message.value
        if val <= u256(0):
            raise Exception("Bet amount must be greater than zero")
            
        # Convert u256 to standard int for JSON serialization
        amount = int(val)
            
        sender = str(gl.message.sender_address)
            
        market_json = self.markets.get(market_id, None)
        if not market_json:
            raise Exception("Market not found")
            
        market = json.loads(market_json)
        if market["status"] != "OPEN":
            raise Exception("Market is already resolved")
        
        # Add to pool (tracking total wei)
        if prediction_is_true:
            market["pool_yes"] += amount
        else:
            market["pool_no"] += amount
            
        market["bets"].append({
            "sender": sender,
            "prediction_is_true": prediction_is_true,
            "amount": amount
        })
        
        self.markets[market_id] = json.dumps(market)
        return True

    @gl.public.write
    def resolve_market(self, market_id: int) -> str:
        """
        Natively fetches multiple URLs, reaches LLM consensus on the claim,
        and distributes native escrowed GEN tokens directly to winners' wallets.
        """
        market_json = self.markets.get(market_id, None)
        if not market_json:
            raise Exception("Market not found")
            
        market = json.loads(market_json)
        if market["status"] != "OPEN":
            raise Exception("Market already resolved")

        claim = market["claim"]
        urls = market["resolution_urls"]
        
        def run_llm() -> str:
            combined_text = ""
            for i, url in enumerate(urls):
                try:
                    # Native fetching, NO proxy!
                    html_content = str(gl.nondet.web.get(url))
                    
                    # Native HTML Stripping to extract readable text
                    clean = re.sub(r'<script.*?>.*?</script>', ' ', html_content, flags=re.DOTALL | re.IGNORECASE)
                    clean = re.sub(r'<style.*?>.*?</style>', ' ', clean, flags=re.DOTALL | re.IGNORECASE)
                    clean = re.sub(r'<[^>]+>', ' ', clean)
                    clean = re.sub(r'\s+', ' ', clean).strip()
                    
                    # Truncate to ensure prompt fits LLM context limits safely
                    safe_text = clean[:4000]
                    combined_text += f"\n--- SOURCE {i+1}: {url} ---\n{safe_text}\n"
                except Exception as e:
                    combined_text += f"\n--- SOURCE {i+1}: {url} ---\n[Failed to fetch: {str(e)}]\n"

            prompt = (
                f"You are the oracle for a decentralized prediction market.\n"
                f"Read the following native web sources:\n"
                f"{combined_text}\n\n"
                f"Market Claim: '{claim}'\n\n"
                f"Based ONLY on the provided sources, is this claim TRUE or FALSE? "
                f"If the sources do not provide enough information to definitively prove or disprove it, answer UNDETERMINED.\n"
                f"Respond with EXACTLY ONE WORD: 'TRUE', 'FALSE', or 'UNDETERMINED'."
            )
            
            llm_output = gl.nondet.exec_prompt(prompt).strip().upper()
            
            if "TRUE" in llm_output:
                return "TRUE"
            elif "FALSE" in llm_output:
                return "FALSE"
            else:
                return "UNDETERMINED"

        # Force consensus across validators
        try:
            consensus_result = gl.eq_principle.prompt_comparative(
                run_llm,
                "The verdicts must match exactly (TRUE, FALSE, or UNDETERMINED)."
            )
        except Exception as e:
            raise Exception(f"Consensus Execution Exception: {str(e)}")
            
        market["status"] = "RESOLVED"
        market["verdict"] = consensus_result
        
        # Native Payout Logic
        if consensus_result == "TRUE":
            # YES wins. NO is burned (locked in contract).
            for bet in market["bets"]:
                if bet["prediction_is_true"]:
                    payout = u256(bet["amount"] * 2)
                    recipient = gl.get_contract_at(Address(bet["sender"]))
                    recipient.emit_transfer(value=payout, on='finalized')
                    
        elif consensus_result == "FALSE":
            # NO wins. YES is burned.
            for bet in market["bets"]:
                if not bet["prediction_is_true"]:
                    payout = u256(bet["amount"] * 2)
                    recipient = gl.get_contract_at(Address(bet["sender"]))
                    recipient.emit_transfer(value=payout, on='finalized')
                    
        else:
            # Refund all bets if undetermined
            for bet in market["bets"]:
                refund = u256(bet["amount"])
                recipient = gl.get_contract_at(Address(bet["sender"]))
                recipient.emit_transfer(value=refund, on='finalized')
                
        self.markets[market_id] = json.dumps(market)
        return consensus_result

    @gl.public.view
    def get_market(self, market_id: int) -> str:
        return self.markets.get(market_id, "{}")
        
    @gl.public.view
    def get_all_markets(self) -> str:
        all_markets = []
        for i in range(1, self.next_market_id):
            m_json = self.markets.get(i, None)
            if m_json:
                all_markets.append(json.loads(m_json))
        return json.dumps(all_markets)