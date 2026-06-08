# { "Depends": "py-genlayer:latest" }
from genlayer import *

class VeriTrust:
    """
    GenLayer Intelligent Contract for decentralized quality assurance and web data validation.
    Validates claims against live web data using consensus-based LLM verification.
    """
    
    # Storage state declarations with explicit type annotations
    verified_claims: TreeMap[str, str]
    claim_metadata: TreeMap[str, str]
    validator_consensus: TreeMap[str, str]
    
    def __init__(self):
        """Initialize storage containers for verified claims and metadata."""
        self.verified_claims = TreeMap()
        self.claim_metadata = TreeMap()
        self.validator_consensus = TreeMap()
    
    @gl.public.write
    def verify_web_claim(self, url: str, claim: str) -> str:
        """
        Verify a web claim against live content using consensus-based LLM validators.
        
        Args:
            url (str): The web URL to validate against
            claim (str): The claim statement to verify
            
        Returns:
            str: JSON-serialized verification result with status and confidence
        """
        # Encapsulate non-deterministic operations within isolation barrier
        result = gl.eq_principle.prompt_comparative(
            self._validate_claim_against_web,
            url,
            claim
        )
        
        # Store deterministic result in persistent storage
        claim_key = f"{url}:{claim[:50]}"
        self.verified_claims[claim_key] = result
        self.claim_metadata[claim_key] = url
        
        return result
    
    def _validate_claim_against_web(self, url: str, claim: str) -> str:
        """
        Non-deterministic validation block: fetch web content and run LLM consensus.
        This runs inside gl.eq_principle.prompt_comparative isolation barrier.
        
        Args:
            url (str): Web URL to fetch
            claim (str): Claim to validate
            
        Returns:
            str: Verification result as JSON string
        """
        # Fetch web content non-deterministically
        web_content = gl.nondet.web.get(url, mode='text')
        
        if not web_content:
            return '{"status": "error", "message": "Failed to fetch URL", "verified": false}'
        
        # Prepare validation prompt for LLM consensus
        validation_prompt = f"""
You are a quality assurance validator for a decentralized oracle network.
Your task is to determine if the following claim is supported by the web content.

CLAIM: {claim}

WEB CONTENT (first 2000 chars):
{web_content[:2000]}

Analyze the content carefully and determine:
1. Is the claim directly supported by the content?
2. Is the claim contradicted by the content?
3. Is the claim neither supported nor contradicted (uncertain)?

Respond with a JSON object containing:
- "verified": boolean (true if claim is clearly supported)
- "confidence": number between 0 and 1
- "reasoning": brief explanation
"""
        
        # Execute LLM validation with consensus requirement
        validator_response = gl.nondet.exec_prompt(validation_prompt)
        
        # Parse and structure the validation response
        try:
            # Extract JSON from potential markdown code blocks
            if "```json" in validator_response:
                json_start = validator_response.find("```json") + 7
                json_end = validator_response.find("```", json_start)
                validator_response = validator_response[json_start:json_end].strip()
            elif "{" in validator_response and "}" in validator_response:
                json_start = validator_response.find("{")
                json_end = validator_response.rfind("}") + 1
                validator_response = validator_response[json_start:json_end]
            
            return validator_response
        except Exception:
            return '{"status": "error", "message": "Failed to parse validator response", "verified": false}'
    
    @gl.public.view
    def get_verified_claim(self, claim_key: str) -> str:
        """
        Retrieve a previously verified claim from storage.
        
        Args:
            claim_key (str): The claim key (url:claim_hash)
            
        Returns:
            str: The verification result, or empty string if not found
        """
        if claim_key in self.verified_claims:
            return self.verified_claims[claim_key]
        return ""
    
    @gl.public.view
    def get_all_verified_claims(self) -> str:
        """
        Retrieve all verified claims from storage.
        
        Returns:
            str: JSON array of all verified claims
        """
        claims_list = []
        for key in self.verified_claims:
            claim_data = {
                "key": key,
                "result": self.verified_claims[key],
                "url": self.claim_metadata.get(key, "")
            }
            claims_list.append(claim_data)
        
        # Format as JSON-compatible string representation
        return str(claims_list)
    
    @gl.public.view
    def get_storage_stats(self) -> str:
        """
        Get statistics about current storage usage.
        
        Returns:
            str: JSON string with claim counts and storage info
        """
        stats = {
            "total_verified_claims": len(self.verified_claims),
            "total_metadata_entries": len(self.claim_metadata),
            "total_consensus_records": len(self.validator_consensus)
        }
        return str(stats)
