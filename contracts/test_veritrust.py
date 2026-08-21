import pytest
import json
import sys
from datetime import datetime
from gltest.assertions import tx_execution_succeeded

def clear_genlayer_cache():
    # Force dynamic reload of the standard library by clearing cached modules
    sys.modules.pop('genlayer', None)
    for k in list(sys.modules.keys()):
        if k.startswith('genlayer.'):
            sys.modules.pop(k, None)

@pytest.mark.integration
def test_independent_sources_rule(direct_vm, direct_deploy, direct_alice):
    clear_genlayer_cache()
    contract = direct_deploy("contracts/veritrustcontract.py")
    direct_vm.sender = direct_alice
    
    # 1. 0 URLs -> fails
    with pytest.raises(Exception, match="Must provide at least one resolution URL"):
        contract.create_market("Claim", [], 300)
        
    # 2. 1 URL -> fails (since we need at least 2 domains)
    with pytest.raises(Exception, match="Must provide at least 2 independent source domains"):
        contract.create_market("Claim", ["https://en.wikipedia.org/wiki/Mars"], 300)
        
    # 3. 2 URLs from the same domain -> fails
    with pytest.raises(Exception, match="Must provide at least 2 independent source domains"):
        contract.create_market("Claim", [
            "https://en.wikipedia.org/wiki/Mars",
            "https://en.wikipedia.org/wiki/OpenAI"
        ], 300)
        
    # 4. 2 URLs from different domains -> succeeds
    result = contract.create_market("Claim", [
        "https://en.wikipedia.org/wiki/Mars",
        "https://www.bbc.com/news"
    ], 300)
    assert result == 1  # returns market_id

@pytest.mark.integration
def test_betting_pools(direct_vm, direct_deploy, direct_alice, direct_bob):
    clear_genlayer_cache()
    contract = direct_deploy("contracts/veritrustcontract.py")
    
    # Create market
    direct_vm.sender = direct_alice
    contract.create_market("Claim", [
        "https://en.wikipedia.org/wiki/Mars",
        "https://www.bbc.com/news"
    ], 300)
    
    # Bob bets YES with 10 GEN
    direct_vm.sender = direct_bob
    direct_vm.value = int(10 * 10**18)  # Set message value in wei
    result = contract.bet(1, True)
    direct_vm.value = 0  # Reset
    assert result is True
    
    # Alice bets NO with 5 GEN
    direct_vm.sender = direct_alice
    direct_vm.value = int(5 * 10**18)  # Set message value in wei
    result = contract.bet(1, False)
    direct_vm.value = 0  # Reset
    assert result is True
    
    # Check market details
    market_json = contract.get_market(1)
    market = json.loads(market_json)
    assert market["pool_yes"] == int(10 * 10**18)
    assert market["pool_no"] == int(5 * 10**18)
    assert len(market["bets"]) == 2

@pytest.mark.integration
def test_resolution_deadline_lock(direct_vm, direct_deploy, direct_alice, direct_bob):
    clear_genlayer_cache()
    contract = direct_deploy("contracts/veritrustcontract.py")
    
    # Set starting time
    direct_vm.warp("2026-08-21T12:00:00Z")
    
    # Create market with 5 minutes delay (300 seconds)
    direct_vm.sender = direct_alice
    contract.create_market("Claim", [
        "https://en.wikipedia.org/wiki/Mars",
        "https://www.bbc.com/news"
    ], 300)
    
    # Bob bets YES
    direct_vm.sender = direct_bob
    direct_vm.value = int(10 * 10**18)
    contract.bet(1, True)
    direct_vm.value = 0
    
    # Try to resolve immediately (should fail because 12:00:00 < 12:05:00)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="Cannot resolve market before the resolution deadline"):
        contract.resolve_market(1)
        
    # Warp time forward by 6 minutes (beyond the 5 minutes deadline)
    direct_vm.warp("2026-08-21T12:06:00Z")
    
    # Mock the LLM call for resolution
    direct_vm.mock_llm(r".*", "TRUE|The claim is verified.")
    
    # Resolve should now succeed
    result = contract.resolve_market(1)
    assert result == "TRUE"
    
    # Verify status is RESOLVED
    market_json = contract.get_market(1)
    market = json.loads(market_json)
    assert market["status"] == "RESOLVED"
    assert market["verdict"] == "TRUE"
