// Contract addresses
const CONTRACT_ADDRESS = '0x86F81966e14dA17193CC3F3d6903184730F36681';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Contract ABIs
const CONTRACT_ABI = [
    'function mint(uint256 quantity) external payable',
    'function MAX_PER_WALLET() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function MAX_SUPPLY() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)'
];

const USDC_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)'
];

// State
let provider;
let signer;
let contract;
let usdcContract;
let userAddress;

// Elements
const connectBtn = document.getElementById('connectBtn');
const approveBtn = document.getElementById('approveBtn');
const walletAddressEl = document.getElementById('walletAddress');
const messageEl = document.getElementById('message');
const quantitySlider = document.getElementById('quantitySlider');

// Message display
function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
}

function hideMessage() {
    messageEl.style.display = 'none';
}

// Connect wallet
connectBtn.addEventListener('click', async () => {
    try {
        // Check for any EVM wallet provider
        let walletProvider = null;
        
        // Priority order: Rabby > Phantom > Binance > OKX > Magic Eden > MetaMask
        if (window.rabby) {
            walletProvider = window.rabby;
            console.log('Using Rabby Wallet');
        } else if (window.phantom?.ethereum) {
            walletProvider = window.phantom.ethereum;
            console.log('Using Phantom Wallet');
        } else if (window.BinanceChain) {
            walletProvider = window.BinanceChain;
            console.log('Using Binance Wallet');
        } else if (window.okxwallet) {
            walletProvider = window.okxwallet;
            console.log('Using OKX Wallet');
        } else if (window.magicEden?.ethereum) {
            walletProvider = window.magicEden.ethereum;
            console.log('Using Magic Eden Wallet');
        } else if (window.ethereum) {
            walletProvider = window.ethereum;
            console.log('Using MetaMask or injected wallet');
        }
        
        if (!walletProvider) {
            showMessage('Please install a Web3 wallet (MetaMask, Rabby, Phantom, etc.)', 'error');
            return;
        }

        showMessage('Connecting wallet...', 'info');
        
        const accounts = await walletProvider.request({ 
            method: 'eth_requestAccounts' 
        });
        
        userAddress = accounts[0];
        
        provider = new ethers.providers.Web3Provider(walletProvider);
        signer = provider.getSigner();
        
        const network = await provider.getNetwork();
        if (network.chainId !== 8453) {
            showMessage('Please switch to Base Mainnet', 'error');
            try {
                await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x2105' }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    try {
                        await walletProvider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x2105',
                                chainName: 'Base',
                                nativeCurrency: {
                                    name: 'Ethereum',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            }]
                        });
                    } catch (addError) {
                        showMessage('Failed to add Base network', 'error');
                        return;
                    }
                }
            }
        }
        
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
        
        walletAddressEl.textContent = `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        walletAddressEl.style.display = 'block';
        
        connectBtn.style.display = 'none';
        approveBtn.style.display = 'block';
        approveBtn.disabled = false;
        
        await loadContractData();
        
        showMessage('Wallet connected successfully!', 'success');
        
    } catch (error) {
        console.error('Connection error:', error);
        showMessage(`Failed to connect: ${error.message}`, 'error');
    }
});

// Load contract data
async function loadContractData() {
    try {
        const maxPerWallet = await contract.MAX_PER_WALLET();
        
        document.getElementById('maxPerWallet').textContent = `(Max ${maxPerWallet} per wallet)`;
        quantitySlider.max = maxPerWallet.toString();
        
        const userBalance = await contract.balanceOf(userAddress);
        if (userBalance.gte(maxPerWallet)) {
            showMessage('You have reached the maximum mint limit', 'error');
            approveBtn.disabled = true;
            return;
        }
        
        // Check if USDC is already approved
        const currentAllowance = await usdcContract.allowance(userAddress, CONTRACT_ADDRESS);
        if (currentAllowance.gt(0)) {
            // Already approved - change button text
            approveBtn.textContent = 'Mint (USDC Already Approved)';
            showMessage('USDC already approved! You can mint', 'success');
        }
        
    } catch (error) {
        console.error('Error loading contract data:', error);
    }
}

// Approve USDC and Mint
approveBtn.addEventListener('click', async () => {
    try {
        const quantity = parseInt(quantitySlider.value);
        const pricePerNFT = 3;
        const totalCost = ethers.utils.parseUnits((quantity * pricePerNFT).toString(), 6);
        
        approveBtn.disabled = true;
        
        // Check current allowance
        const currentAllowance = await usdcContract.allowance(userAddress, CONTRACT_ADDRESS);
        
        // Step 1: Approve USDC if needed
        if (currentAllowance.lt(totalCost)) {
            showMessage('Approving USDC... Confirm in wallet', 'info');
            
            const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, totalCost);
            showMessage('Approval pending...', 'info');
            await approveTx.wait();
            
            showMessage('USDC approved! Now minting...', 'success');
        } else {
            showMessage('USDC already approved! Minting...', 'info');
        }
        
        // Step 2: Mint NFT
        showMessage('Minting... Confirm in wallet', 'info');
        
        const mintTx = await contract.mint(quantity);
        showMessage('Minting in progress...', 'info');
        
        await mintTx.wait();
        
        showMessage(`Successfully minted ${quantity} x402Cat${quantity > 1 ? 's' : ''}! 🎉`, 'success');
        
        await loadContractData();
        
        approveBtn.disabled = false;
        
    } catch (error) {
        console.error('Transaction error:', error);
        
        let errorMessage = 'You need USDC to mint';
        
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            errorMessage = 'Transaction cancelled';
        } else if (error.message && error.message.includes('insufficient funds')) {
            errorMessage = 'You need ETH for gas fees';
        } else if (error.message && error.message.includes('exceeds balance')) {
            errorMessage = 'You need more USDC';
        }
        
        showMessage(errorMessage, 'error');
        approveBtn.disabled = false;
    }
});

// Listen for account changes
const walletProvider = window.rabby || window.phantom?.ethereum || window.BinanceChain || window.okxwallet || window.magicEden?.ethereum || window.ethereum;

if (walletProvider) {
    walletProvider.on('accountsChanged', (accounts) => {
        // Always reload when account changes - user needs to reconnect manually
        location.reload();
    });
    
    walletProvider.on('chainChanged', () => {
        location.reload();
    });
    
    // Prevent auto-connect on page load
    walletProvider.on('connect', () => {
        console.log('Wallet connected');
    });
}

// Clear any cached connection on page load
window.addEventListener('load', () => {
    // Don't auto-connect wallet on page refresh
    console.log('Page loaded - wallet connection requires user action');
});