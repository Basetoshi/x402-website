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
const mintBtn = document.getElementById('mintBtn');
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
            mintBtn.disabled = true;
        }
        
    } catch (error) {
        console.error('Error loading contract data:', error);
    }
}

// Approve USDC
approveBtn.addEventListener('click', async () => {
    try {
        const quantity = parseInt(quantitySlider.value);
        const pricePerNFT = 3; // 3 USDC per NFT
        const totalCost = ethers.utils.parseUnits((quantity * pricePerNFT).toString(), 6);
        
        showMessage('Approving USDC... Confirm in wallet', 'info');
        approveBtn.disabled = true;
        
        const tx = await usdcContract.approve(CONTRACT_ADDRESS, totalCost);
        
        showMessage('Approval pending...', 'info');
        
        await tx.wait();
        
        showMessage('USDC approved! You can now mint ✅', 'success');
        
        mintBtn.style.display = 'block';
        mintBtn.disabled = false;
        
    } catch (error) {
        console.error('Approval error:', error);
        
        let errorMessage = 'You need USDC to mint';
        
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            errorMessage = 'Transaction cancelled';
        } else if (error.message && error.message.includes('insufficient funds')) {
            errorMessage = 'You need ETH for gas fees';
        }
        
        showMessage(errorMessage, 'error');
        approveBtn.disabled = false;
    }
});

// Mint NFT
mintBtn.addEventListener('click', async () => {
    try {
        const quantity = parseInt(quantitySlider.value);
        
        showMessage('Minting... Confirm in wallet', 'info');
        mintBtn.disabled = true;
        
        const tx = await contract.mint(quantity);
        
        showMessage('Minting in progress...', 'info');
        
        const receipt = await tx.wait();
        
        showMessage(`Successfully minted ${quantity} x402Cat${quantity > 1 ? 's' : ''}! 🎉`, 'success');
        
        await loadContractData();
        
        mintBtn.disabled = false;
        approveBtn.disabled = false;
        
    } catch (error) {
        console.error('Minting error:', error);
        
        let errorMessage = 'Minting failed';
        
        if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
            errorMessage = 'Transaction cancelled';
        } else if (error.message && error.message.includes('insufficient funds')) {
            errorMessage = 'You need ETH for gas fees';
        } else if (error.message && error.message.includes('exceeds balance')) {
            errorMessage = 'You need more USDC';
        }
        
        showMessage(errorMessage, 'error');
        mintBtn.disabled = false;
    }
});

// Listen for account changes
const walletProvider = window.rabby || window.phantom?.ethereum || window.BinanceChain || window.okxwallet || window.magicEden?.ethereum || window.ethereum;

if (walletProvider) {
    walletProvider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else {
            userAddress = accounts[0];
            walletAddressEl.textContent = `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            loadContractData();
        }
    });
    
    walletProvider.on('chainChanged', () => {
        location.reload();
    });
}