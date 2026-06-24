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
        
        # 1. Fetch web data
        try:
            raw_web_data = gl.nondet.web.get(url, mode="text")
            web_data = raw_web_data[:12000] if raw_web_data else ""
        except Exception as e:
            fallback = f"INSUFFICIENT_DATA|Failed to fetch the webpage: {str(e)}"
            self.verified_claims[storage_key] = fallback
            return fallback

        # 2. Strict single-word prompt for deterministic LLM output across validators
        prompt = (
            f"Analyze this webpage data:\n\n"
            f"--- CONTENT ---\n{web_data}\n--- END ---\n\n"
            f"Claim: '{claim}'\n\n"
            f"Respond with EXACTLY ONE WORD. Is the claim supported? Output 'VERIFIED', 'REFUTED', or 'INSUFFICIENT_DATA'."
        )

        # 3. Gather decentralized LLM output
        llm_output = gl.nondet.exec_prompt(prompt).strip().upper()

        # 4. Normalize to strictly matching strings so consensus never fails silently
        if "VERIFIED" in llm_output:
            final_verdict = "VERIFIED|The claim is supported by the webpage content."
        elif "REFUTED" in llm_output:
            final_verdict = "REFUTED|The claim is contradicted by the webpage content."
        else:
            final_verdict = "INSUFFICIENT_DATA|Could not conclusively verify or refute the claim."

        # 5. Persist to state
        self.verified_claims[storage_key] = final_verdict
        return final_verdict

    @gl.public.view
    def get_verification_status(self, url: str, claim: str) -> str:
        """
        Read-only state reader to fetch historical evaluations.
        """
        storage_key = f"{url}::{claim}"

        if storage_key in self.verified_claims:
            return self.verified_claims[storage_key]

        return "NOT_YET_EVALUATED"