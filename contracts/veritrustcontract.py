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
        Executes an intelligent read of the provided URL and uses Genlayer's LLM consensus 
        to verify if the claim holds true based on the webpage content.
        """
        with gl.eq_principle.prompt_comparative:
            # Safely scrape text content from the target web address
            web_data = gl.nondet.web.get(url, mode="text")
            
            # Truncate the text to strictly prevent exceeding the LLM context window (which causes silent node failures)
            if len(web_data) > 10000:
                web_data = web_data[:10000] + "... [TRUNCATED]"
            
            # Craft the structured verification instructions tailored for Wikipedia
            prompt = (
                f"You are a highly analytical Wikipedia Fact Checker on the GenLayer network.\n"
                f"Your task is to analyze the following Wikipedia article text and determine if the user's factual claim is objectively supported by the article.\n\n"
                f"[USER FACTUAL CLAIM]: {claim}\n"
                f"[WIKIPEDIA ARTICLE EXTRACT]: {web_data}\n\n"
                f"Rules:\n"
                f"1. If the claim is explicitly supported by the Wikipedia text, output exactly 'VERIFIED'.\n"
                f"2. If the claim is explicitly contradicted by the Wikipedia text, output exactly 'REFUTED'.\n"
                f"3. If there is not enough context in the article to make a definitive judgment, output exactly 'INSUFFICIENT_DATA'.\n"
                f"Do not add any additional explanation or formatting."
            )
            consensus_result = gl.nondet.exec_prompt(prompt)

        # Step 2: Build a unique key to persist the decision to state storage
        storage_key = f"{url}::{claim}"
        self.verified_claims[storage_key] = consensus_result

        return consensus_result

    @gl.public.view
    def get_verification_status(self, url: str, claim: str) -> str:
        """
        Read-only state reader to fetch historical evaluations.
        """
        storage_key = f"{url}::{claim}"

        if storage_key in self.verified_claims:
            return self.verified_claims[storage_key]

        return "NOT_YET_EVALUATED"