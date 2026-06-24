# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class VeriTrustAI(gl.Contract):
    """
    VeriTrust AI: A decentralized web content verification oracle
    using multi-validator LLM consensus blocks.
    """

    # Persistent storage using GenLayer's strict TreeMap structure
    verified_claims: TreeMap[str, str]

    def __init__(self):
        # Correctly initialize the internal contract state layout
        self.verified_claims = TreeMap[str, str]()

    @gl.public.write
    def verify_web_claim(self, url: str, claim: str) -> str:
        """
        Fetches web content and uses an LLM consensus block to verify a user's claim.
        """
        # Step 1: Execute non-deterministic tasks inside GenLayer's equivalence principle block
        consensus_result = gl.eq_principle.prompt_comparative(
            self._fetch_and_verify,
            url,
            claim
        )

        # Step 2: Build a unique key to persist the decision to state storage
        storage_key = f"{url}::{claim}"
        self.verified_claims[storage_key] = consensus_result

        return consensus_result

    def _fetch_and_verify(self, url: str, claim: str) -> str:
        # Safely scrape text content from the target web address and truncate to prevent LLM context limits
        raw_web_data = gl.nondet.web.get(url, mode="text")
        web_data = raw_web_data[:12000] if raw_web_data else ""

        # Craft the structured verification instructions for the validator nodes
        prompt = (
            f"Analyze this webpage data closely:\n\n"
            f"--- CONTENT START ---\n{web_data}\n--- CONTENT END ---\n\n"
            f"User Claim: '{claim}'\n\n"
            f"Does the content support the claim? Respond in this exact format:\n"
            f"<VERDICT>|<SHORT_REMARK>\n"
            f"Where <VERDICT> is 'VERIFIED', 'REFUTED', or 'INSUFFICIENT_DATA'.\n"
            f"For <SHORT_REMARK>, provide a direct quote (max 1 sentence) from the text that justifies the verdict. If INSUFFICIENT_DATA, write 'No relevant information found.'"
        )

        # Gather decentralized LLM consensus
        return gl.nondet.exec_prompt(prompt)

    @gl.public.view
    def get_verification_status(self, url: str, claim: str) -> str:
        """
        Read-only state reader to fetch historical evaluations.
        """
        storage_key = f"{url}::{claim}"

        if storage_key in self.verified_claims:
            return self.verified_claims[storage_key]

        return "NOT_YET_EVALUATED"