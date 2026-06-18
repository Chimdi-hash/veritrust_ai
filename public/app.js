// 1. Initialize configuration values
// REMEMBER to change this placeholder string to your actual deployed address!
const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE';
const RPC_URL = 'https://studio.genlayer.com/api';

const client = new GenLayerClient(RPC_URL);

// 2. DOM Elements Mapping
const connectBtn = document.getElementById('connectBtn');
const walletDisplay = document.getElementById('walletDisplay');
const verifyBtn = document.getElementById('verifyBtn');
const urlInput = document.getElementById('urlInput');
const claimInput = document.getElementById('claimInput');
const statusCard = document.getElementById('statusCard');
const errorBanner = document.getElementById('errorBanner');

// 3. Wallet Connection Interaction Handler
if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        hideUiError();
        connectBtn.innerText = 'Connecting...';
        connectBtn.disabled = true;

        try {
            const address = await client.connectWallet();
            console.log('Successfully connected:', address);

            const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

            if (walletDisplay) {
                walletDisplay.innerText = `Connected: ${shortAddress}`;
                walletDisplay.style.display = 'block';
            }

            connectBtn.innerText = 'Wallet Connected';
            connectBtn.style.backgroundColor = '#10B981';

            if (verifyBtn) verifyBtn.disabled = false;

        } catch (error) {
            console.error('Wallet connection failed:', error);
            showUiError(error.message || 'Failed to authorize wallet extension.');
            connectBtn.innerText = 'Connect Wallet';
            connectBtn.disabled = false;
        }
    });
}

// 4. Main Contract Action Transaction Form Submission
if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const claim = claimInput.value.trim();

        if (!url || !claim) {
            showUiError('Please fill out both the target URL and Claim input fields.');
            return;
        }

        setLoadingState(true);
        hideUiError();
        updateDashboardStatus('AWAITING CONSENSUS...');

        try {
            console.log('Sending transaction direct to GenLayer endpoint...');
            const txHash = await client.verifyWebClaim(CONTRACT_ADDRESS, url, claim);
            console.log('Transaction broadcasted successfully! Hash identifier:', txHash);

            // Give Studionet a brief moment to process the state change block
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('Reading updated response state from contract mapping arrays...');
            const consensusResult = await client.getVerificationStatus(CONTRACT_ADDRESS, url, claim);

            updateDashboardStatus(consensusResult);

        } catch (error) {
            console.error('Handshake verification failed:', error);
            showUiError(`Transaction Error: ${error.message || 'Execution error.'}`);
            updateDashboardStatus('ERROR');
        } finally {
            setLoadingState(false);
        }
    });
}

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
        else if (result === 'AWAITING CONSENSUS...') statusCard.style.color = '#3B82F6';
        else statusCard.style.color = '#FFFFFF';
    }
}

function showUiError(message) {
    if (errorBanner) {
        errorBanner.innerText = message;
        errorBanner.style.display = 'block';
    }
}

// Clear old runtime messages
function hideUiError() {
    if (errorBanner) {
        errorBanner.style.display = 'none';
    }
}