// 1. Initialize configuration parameters
// REPLACE with your live deployed hexadecimal contract address from GenLayer Studio
const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE';

// Use GenLayer's production endpoint for live web deployments
const RPC_URL = 'https://studio.genlayer.com/api';

const client = new GenLayerClient(RPC_URL);

// 2. DOM Elements Mapping
const connectBtn = document.getElementById('connectBtn'); // Make sure you have this button in your HTML!
const walletDisplay = document.getElementById('walletDisplay');
const verifyBtn = document.getElementById('verifyBtn');
const urlInput = document.getElementById('urlInput');
const claimInput = document.getElementById('claimInput');
const statusCard = document.getElementById('statusCard');
const errorBanner = document.getElementById('errorBanner');

// 3. Wallet Connection Action Listener
if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        hideUiError();
        connectBtn.innerText = 'Connecting...';
        connectBtn.disabled = true;

        try {
            const address = await client.connectWallet();
            console.log('Wallet authenticated successfully:', address);

            // Format address for visual clarity
            const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

            if (walletDisplay) {
                walletDisplay.innerText = `Connected: ${shortAddress}`;
                walletDisplay.style.display = 'block';
            }

            connectBtn.innerText = 'Wallet Connected';
            connectBtn.style.backgroundColor = '#10B981'; // Green accent indicating success

            // Enable main call actions now that wallet metadata exists
            if (verifyBtn) verifyBtn.disabled = false;

        } catch (error) {
            console.error('Wallet connection rejected:', error);
            showUiError(error.message || 'Failed to authenticate wallet connection.');
            connectBtn.innerText = 'Connect Wallet';
            connectBtn.disabled = false;
        }
    });
}

// 4. Verification Form Submission Action Listener
if (verifyBtn) {
    // Initially disable until wallet connection state is established
    verifyBtn.disabled = true;

    verifyBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const claim = claimInput.value.trim();

        if (!url || !claim) {
            showUiError('Please fill out both the URL and Claim fields.');
            return;
        }

        if (!client.userAddress) {
            showUiError('Please connect your browser wallet first.');
            return;
        }

        setLoadingState(true);
        hideUiError();

        try {
            console.log('Requesting transaction signature via user wallet...');
            const txHash = await client.verifyWebClaim(CONTRACT_ADDRESS, url, claim);
            console.log('Transaction signed and broadcasted! Hash:', txHash);

            console.log('Fetching on-chain consensus resolution from storage...');
            const consensusResult = await client.getVerificationStatus(CONTRACT_ADDRESS, url, claim);

            updateDashboardStatus(consensusResult);

        } catch (error) {
            console.error('Blockchain action failed:', error);
            showUiError(`Transaction Error: ${error.message || 'Signature request rejected.'}`);
            updateDashboardStatus('ERROR');
        } finally {
            setLoadingState(false);
        }
    });
}

// 5. Interface State Helpers
function setLoadingState(isLoading) {
    if (isLoading) {
        verifyBtn.disabled = true;
        verifyBtn.innerText = 'Signing & Validating...';
    } else {
        verifyBtn.disabled = false;
        verifyBtn.innerText = 'Verify via GenLayer';
    }
}

function updateDashboardStatus(result) {
    if (statusCard) {
        statusCard.innerText = result;
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