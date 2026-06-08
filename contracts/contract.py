# { "Depends": "py-genlayer:latest" }

from genlayer import *

class VeriTrust:
    """
    VeriTrust - A production-ready GenLayer Intelligent Contract for web claim verification.
    Fetches web content, uses LLM to verify claims against the fetched data,
    and stores verification results on-chain with full consensus through determinism boundaries.
    """
    
    # Persistent storage declaration with explicit type annotations
    verified_claims: TreeMap[str, str]
    verification_log: TreeMap[str, str]
    claim_counter: int
    
    def __init__(self) -> None:
        """Initialize contract state with TreeMap storage for on-chain persistence."""
        self.verified_claims = TreeMap()
        self.verification_log = TreeMap()
        self.claim_counter = 0
    
    @gl.public.write
    def verify_web_claim(self, url: str, claim: str) -> str:
        """
        Verify a claim against web content fetched from the provided URL.
        
        This method:
        1. Fetches text content from the provided URL
        2. Uses LLM to verify if the fetched content supports the claim
        3. Stores the verification result on-chain
        4. Returns the verdict (VERIFIED, UNVERIFIED, or ERROR)
        
        Args:
            url: The URL to fetch content from for verification
            claim: The claim to verify against the fetched web content
            
        Returns:
            A string verdict: "VERIFIED", "UNVERIFIED", or "ERROR"
        """
        
        # Increment claim counter for unique tracking
        self.claim_counter += 1
        claim_id: str = f"claim_{self.claim_counter}"
        
        # Wrap non-deterministic operations in equivalence principle boundary
        # This ensures all validators reach consensus on the same result
        verdict: str = gl.eq_principle.prompt_comparative(
            self._fetch_and_verify,
            url,
            claim
        )
        
        # Store verification result on-chain
        self.verified_claims[claim_id] = verdict
        self.verification_log[claim_id] = f"URL: {url} | Claim: {claim} | Verdict: {verdict}"
        
        return verdict
    
    def _fetch_and_verify(self, url: str, claim: str) -> str:
        """
        Internal helper method that fetches web content and verifies the claim.
        This runs inside the determinism boundary to ensure consensus.
        
        Args:
            url: The URL to fetch content from
            claim: The claim to verify
            
        Returns:
            The verification verdict
        """
        
        try:
            # Fetch web content from the provided URL
            web_response: str = gl.nondet.web.get(url)
            
            if not web_response or len(web_response) == 0:
                return "ERROR"
            
            # Prepare LLM prompt for claim verification
            prompt: str = f"""You are a fact-checking AI. Verify the following claim against the provided web content.

Web Content:
{web_response[:2000]}

Claim to Verify:
{claim}

Based on the web content above, respond with ONLY one word:
- VERIFIED if the web content supports/confirms the claim
- UNVERIFIED if the web content contradicts or does not support the claim
- ERROR if you cannot determine"""
            
            # Execute LLM verification within determinism boundary
            llm_response: str = gl.nondet.exec_prompt(prompt)
            
            # Parse and normalize the LLM response
            response_upper: str = llm_response.strip().upper()
            
            if "VERIFIED" in response_upper:
                return "VERIFIED"
            elif "UNVERIFIED" in response_upper:
                return "UNVERIFIED"
            else:
                return "ERROR"
                
        except Exception as e:
            return "ERROR"
    
    @gl.public.view
    def get_claim_verdict(self, claim_id: str) -> str:
        """
        Retrieve the stored verification verdict for a specific claim.
        
        Args:
            claim_id: The unique identifier of the claim
            
        Returns:
            The stored verdict string, or "NOT_FOUND" if claim does not exist
        """
        
        if claim_id in self.verified_claims:
            return self.verified_claims[claim_id]
        return "NOT_FOUND"
    
    @gl.public.view
    def get_verification_log(self, claim_id: str) -> str:
        """
        Retrieve the complete verification log entry for a claim.
        
        Args:
            claim_id: The unique identifier of the claim
            
        Returns:
            The log entry string, or "NOT_FOUND" if claim does not exist
        """
        
        if claim_id in self.verification_log:
            return self.verification_log[claim_id]
        return "NOT_FOUND"
    
    @gl.public.view
    def get_total_claims_processed(self) -> int:
        """
        Get the total number of claims processed by this contract.
        
        Returns:
            The count of claims processed
        """
        
        return self.claim_counter
