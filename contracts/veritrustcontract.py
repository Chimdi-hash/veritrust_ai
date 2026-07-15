# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class VeriTrustAI(gl.Contract):
    """
    VeriTrust AI: A decentralized web content verification oracle
    using strict LLM consensus blocks.
    """

    # Persistent storage using GenLayer's strict TreeMap structure
    verified_claims: TreeMap[str, str]

    def __init__(self):
        self.verified_claims = TreeMap()

    @gl.public.write
    def verify_web_claim(self, url: str, claim: str) -> str:
        storage_key = f"{url}::{claim}"
        
        # Define a zero-argument callable that captures our arguments from the outer scope
        def run_llm() -> str:
            try:
                # Fetching happens securely on the validator nodes, inside the consensus block!
                # We cast to string just in case the SDK returns a wrapper object
                web_data = str(gl.nondet.web.get(url))
                safe_web_data = web_data[:3000]
                
                if not safe_web_data or len(safe_web_data.strip()) == 0:
                    return "INSUFFICIENT_DATA|Failed to fetch the webpage content."
            except Exception as e:
                return f"INSUFFICIENT_DATA|Failed to fetch the webpage content: {str(e)}"
                
            prompt = (
                f"Analyze this webpage data:\n\n"
                f"--- CONTENT ---\n{safe_web_data}\n--- END ---\n\n"
                f"Claim: '{claim}'\n\n"
                f"Respond with EXACTLY ONE WORD. Is the claim supported? Output 'VERIFIED', 'REFUTED', or 'INSUFFICIENT_DATA'."
            )
            # Inside eq_principle block, this non-deterministic call is ALLOWED!
            llm_output = gl.nondet.exec_prompt(prompt).strip().upper()

            if "VERIFIED" in llm_output:
                return "VERIFIED|The claim is supported by the webpage content."
            elif "REFUTED" in llm_output:
                return "REFUTED|The claim is contradicted by the webpage content."
            else:
                return "INSUFFICIENT_DATA|Could not conclusively verify or refute the claim."

        # GenVM REQUIRES non-deterministic functions to be run inside an eq_principle block
        try:
            consensus_result = gl.eq_principle.prompt_comparative(
                run_llm,
                "The verdicts must match exactly (VERIFIED, REFUTED, or INSUFFICIENT_DATA)."
            )
        except Exception as e:
            consensus_result = f"ERROR|Consensus Execution Exception: {str(e)}"
            
        # Provenance: Bind the sender address to the result
        try:
            sender = str(gl.message.sender_address)
        except Exception:
            sender = "UNKNOWN_SENDER"
            
        final_result = f"{consensus_result}|{sender}"
        self.verified_claims[storage_key] = final_result
        return final_result

    @gl.public.view
    def get_verification_status(self, url: str, claim: str) -> str:
        """
        Read-only state reader to fetch historical evaluations.
        """
        storage_key = f"{url}::{claim}"

        if storage_key in self.verified_claims:
            return self.verified_claims[storage_key]

        return "NOT_YET_EVALUATED"