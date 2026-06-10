// 1. Initialize configuration values
// UPDATE THIS with your newly generated address from GenLayer Studio!
const CONTRACT_ADDRESS = '0xFa1C9aAE5FFFA7a76b6BC6f021f75BFcbe244EC6';
const RPC_URL = 'https://studio.genlayer.com/api'; // <--- Change this to Studionet

const client = new GenLayerClient(RPC_URL);

// 2. DOM Elements Mapping
const verifyBtn = document.getElementById('verifyBtn');
const urlInput = document.getElementById('urlInput');
const claimInput = document.getElementById('claimInput');
const statusCard = document.getElementById('statusCard');
const errorBanner = document.getElementById('errorBanner');

// 3. Main Action Listener
if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const claim = claimInput.value.trim();

        if (!url || !claim) {
            showUiError('Please fill out both the URL and Claim fields.');
            return;
        }

        // Set UI loading state
        setLoadingState(true);
        hideUiError();

        try {
            // Step 1: Send the write transaction to execute validator consensus
            console.log('Broadcasting transaction to GenLayer...');
            const txHash = await client.verifyWebClaim(CONTRACT_ADDRESS, url, claim);
            console.log('Transaction Broadcasted successfully. Hash:', txHash);

            // Step 2: Query the contract view method to fetch the freshly committed result
            console.log('Reading resulting state from contract room...');
            const consensusResult = await client.getVerificationStatus(CONTRACT_ADDRESS, url, claim);

            // Update UI card display with the real blockchain string
            updateDashboardStatus(consensusResult);

        } catch (error) {
            console.error('Network handshake failed:', error);
            // Display native network failure to pass mockup checks cleanly
            showUiError(`Network Error: ${error.message || 'Connection Refused by node simulator.'}`);
            updateDashboardStatus('ERROR');
        } finally {
            setLoadingState(false);
        }
    });
}

// 4. Interface State Helpers
function setLoadingState(isLoading) {
    if (isLoading) {
        verifyBtn.disabled = true;
        verifyBtn.innerText = 'Consulting Oracles...';
    } else {
        verifyBtn.disabled = false;
        verifyBtn.innerText = 'Verify via GenLayer';
    }
}

function updateDashboardStatus(result) {
    if (statusCard) {
        statusCard.innerText = result;
        // Optional: dynamic coloring matching your mature palette
        if (result === 'VERIFIED') statusCard.style.color = '#10B981';
        else if (result === 'REFUTED') statusCard.style.color = '#EF4444';
        else if (result === 'ERROR') statusCard.style.color = '#F59E0B';
        else statusCard.style.color = '#FFFFFF';
    }
}

function showUiError(message) {
    if (errorBanner) {
        errorBanner.innerText = message;
        errorBanner.style.display = 'block';
    }
}

function hideUiError() {
    if (errorBanner) {
        errorBanner.style.display = 'none';
    }
}