// Contract Addresses
const NFT_CONTRACT = '0x86F81966e14dA17193CC3F3d6903184730F36681';
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453;
const MINT_PRICE = 3000000; // 3 USDC (6 decimals)

// ABIs
const NFT_ABI = [
    'function mint(uint256 quantity) external',
    'function totalSupply() external view returns (uint256)',
    'function mintPrice() external view returns (uint256)',
    'function mintActive() external view returns (bool)',
    'function MAX_SUPPLY() external view returns (uint256)',
    'function balanceOf(address owner) external view returns (uint256)'
];

const USDC_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)'
];

// Global State
let provider;
let signer;
let userAddress;
let nftContract;
let usdcContract;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initGallery();
    initEventListeners();
    updateMintedCount();
});

// Particles Background
function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 240, 255, ${Math.random() * 0.5 + 0.2})`;
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Initialize Gallery
function initGallery() {
    const galleryTrack = document.getElementById('galleryTrack');
    const sampleNFTs = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 50, 100, 200, 500, 1000];
    
    // Create two sets for infinite scroll
    for (let i = 0; i < 2; i++) {
        sampleNFTs.forEach(tokenId => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <img src="https://gateway.lighthouse.storage/ipfs/bafybeiaa2nnwqbbnwfansu4gevlo4zmsjxgsivutnsfeat3mbyoxenprnu/${tokenId}.png" 
                     alt="Pixel Cat #${tokenId}"
                     loading="lazy">
                <div class="gallery-item-info">
                    <div class="gallery-item-name">Pixel Cat #${tokenId}</div>
                    <div class="gallery-item-rarity">Rarity: ${(Math.random() * 100).toFixed(2)}</div>
                </div>
            `;
            galleryTrack.appendChild(item);
        });
    }
}

// Event Listeners
function initEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('increaseBtn').addEventListener('click', increaseQuantity);
    document.getElementById('decreaseBtn').addEventListener('click', decreaseQuantity);
    document.getElementById('quantity').addEventListener('input', updateTotal);
    document.getElementById('approveBtn').addEventListener('click', approveUSDC);
    document.getElementById('mintBtn').addEventListener('click', mintNFT);
}

// Connect Wallet
async function connectWallet() {
    try {
        if (!window.ethereum) {
            showStatus('Please install MetaMask!', 'error');
            return;
        }
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Check network
        const network = await provider.getNetwork();
        if (network.chainId !== BASE_CHAIN_ID) {
            await switchToBase();
        }
        
        // Initialize contracts
        nftContract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, signer);
        usdcContract = new ethers.Contract(USDC_CONTRACT, USDC_ABI, signer);
        
        // Update UI
        updateConnectionStatus(true);
        updateButtons();
        await checkApproval();
        
    } catch (error) {
        console.error('Connection error:', error);
        showStatus('Failed to connect wallet', 'error');
    }
}

// Switch to Base Network
async function switchToBase() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }], // Base mainnet
        });
    } catch (error) {
        if (error.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x2105',
                    chainName: 'Base',
                    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://mainnet.base.org'],
                    blockExplorerUrls: ['https://basescan.org']
                }]
            });
        }
    }
}

// Update Connection Status
function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    const connectBtn = document.getElementById('connectWallet');
    
    if (connected) {
        status.classList.add('connected');
        status.innerHTML = `
            <div class="status-dot"></div>
            <span>Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}</span>
        `;
        connectBtn.textContent = 'Connected';
        connectBtn.classList.add('connected');
    }
}

// Quantity Controls
function increaseQuantity() {
    const input = document.getElementById('quantity');
    const current = parseInt(input.value);
    if (current < 20) {
        input.value = current + 1;
        updateTotal();
    }
}

function decreaseQuantity() {
    const input = document.getElementById('quantity');
    const current = parseInt(input.value);
    if (current > 1) {
        input.value = current - 1;
        updateTotal();
    }
}

function updateTotal() {
    const quantity = parseInt(document.getElementById('quantity').value);
    const total = (quantity * 3).toFixed(1);
    document.getElementById('totalPrice').textContent = `${total} USDC`;
}

// Check USDC Approval
async function checkApproval() {
    try {
        const quantity = parseInt(document.getElementById('quantity').value);
        const requiredAmount = MINT_PRICE * quantity;
        
        const allowance = await usdcContract.allowance(userAddress, NFT_CONTRACT);
        
        if (allowance.gte(requiredAmount)) {
            document.getElementById('approveBtn').disabled = true;
            document.getElementById('mintBtn').disabled = false;
            document.getElementById('approveBtn').innerHTML = `
                <span class="button-text">✓ USDC Approved</span>
            `;
        } else {
            document.getElementById('approveBtn').disabled = false;
            document.getElementById('mintBtn').disabled = true;
        }
    } catch (error) {
        console.error('Approval check error:', error);
    }
}

// Approve USDC
async function approveUSDC() {
    try {
        showStatus('Approving USDC...', 'loading');
        
        const quantity = parseInt(document.getElementById('quantity').value);
        const amount = MINT_PRICE * quantity;
        
        const tx = await usdcContract.approve(NFT_CONTRACT, amount);
        showStatus('Waiting for confirmation...', 'loading');
        
        await tx.wait();
        
        showStatus('USDC approved successfully!', 'success');
        await checkApproval();
        
    } catch (error) {
        console.error('Approval error:', error);
        showStatus(error.message || 'Approval failed', 'error');
    }
}

// Mint NFT
async function mintNFT() {
    try {
        const quantity = parseInt(document.getElementById('quantity').value);
        
        showStatus(`Minting ${quantity} NFT${quantity > 1 ? 's' : ''}...`, 'loading');
        
        const tx = await nftContract.mint(quantity);
        showStatus('Waiting for confirmation...', 'loading');
        
        await tx.wait();
        
        showStatus(`Successfully minted ${quantity} Pixel Cat${quantity > 1 ? 's' : ''}! 🎉`, 'success');
        
        // Trigger confetti
        triggerConfetti();
        
        // Update counts
        await updateMintedCount();
        await checkApproval();
        
    } catch (error) {
        console.error('Mint error:', error);
        showStatus(error.message || 'Mint failed', 'error');
    }
}

// Update Minted Count
async function updateMintedCount() {
    try {
        // Try to get from contract if connected
        if (nftContract) {
            const totalSupply = await nftContract.totalSupply();
            const count = totalSupply.toNumber();
            document.getElementById('mintedCount').textContent = `${count}/5555`;
            document.getElementById('progressText').textContent = `${count}/5555`;
            document.getElementById('progressFill').style.width = `${(count / 5555) * 100}%`;
            document.getElementById('nextTokenId').textContent = `#${count + 1}`;
        } else {
            // Use public RPC to get count without connecting
            const publicProvider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
            const publicContract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, publicProvider);
            const totalSupply = await publicContract.totalSupply();
            const count = totalSupply.toNumber();
            document.getElementById('mintedCount').textContent = `${count}/5555`;
            document.getElementById('progressText').textContent = `${count}/5555`;
            document.getElementById('progressFill').style.width = `${(count / 5555) * 100}%`;
        }
    } catch (error) {
        console.error('Failed to get minted count:', error);
    }
}

// Update Buttons State
function updateButtons() {
    if (userAddress) {
        document.getElementById('approveBtn').disabled = false;
    }
}

// Show Status Message
function showStatus(message, type) {
    const statusEl = document.getElementById('txStatus');
    statusEl.textContent = message;
    statusEl.className = `tx-status ${type}`;
    statusEl.classList.remove('hidden');
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 5000);
    }
}

// Confetti Animation
function triggerConfetti() {
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const pieces = [];
    const numberOfPieces = 200;
    const colors = ['#00f0ff', '#a855f7', '#ec4899', '#fbbf24', '#34d399'];
    
    for (let i = 0; i < numberOfPieces; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            rotation: Math.random() * 360,
            size: Math.random() * 10 + 5,
            speedY: Math.random() * 3 + 2,
            speedRotation: Math.random() * 10 - 5,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    
    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let allOffScreen = true;
        
        pieces.forEach(piece => {
            piece.y += piece.speedY;
            piece.rotation += piece.speedRotation;
            
            if (piece.y < canvas.height) allOffScreen = false;
            
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate((piece.rotation * Math.PI) / 180);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
            ctx.restore();
        });
        
        if (!allOffScreen) {
            requestAnimationFrame(animateConfetti);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    animateConfetti();
}

// Auto-update minted count every 30 seconds
setInterval(updateMintedCount, 30000);