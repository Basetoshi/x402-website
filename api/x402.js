// API endpoint for x402scan registration
// This file should be placed in: /api/x402.js (for Vercel Serverless Functions)

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return x402 schema
  const x402Schema = {
    "x402Version": 1,
    "accepts": [
      {
        "scheme": "exact",
        "network": "base",
        "maxAmountRequired": "3000000",
        "resource": "https://x402-website.vercel.app",
        "description": "x402Cats NFT Mint - Mint unique pixel cat NFTs on Base blockchain. 5,555 total supply, max 20 per wallet. Each cat is a randomly generated pixel art with unique traits.",
        "mimeType": "application/json",
        "payTo": "0x86F81966e14dA17193CC3F3d6903184730F36681",
        "maxTimeoutSeconds": 300,
        "asset": "USDC",
        "outputSchema": {
          "input": {
            "type": "http",
            "method": "POST",
            "bodyType": "json",
            "bodyFields": {
              "quantity": {
                "type": "number",
                "required": true,
                "description": "Number of NFTs to mint (1-20)"
              },
              "walletAddress": {
                "type": "string",
                "required": true,
                "description": "Wallet address to mint NFTs to"
              }
            }
          },
          "output": {
            "transactionHash": {
              "type": "string",
              "description": "Transaction hash of the mint operation"
            },
            "tokenIds": {
              "type": "array",
              "description": "Array of minted token IDs"
            },
            "quantity": {
              "type": "number",
              "description": "Number of NFTs minted"
            },
            "totalCost": {
              "type": "string",
              "description": "Total cost in USDC"
            },
            "success": {
              "type": "boolean",
              "description": "Whether the mint was successful"
            }
          }
        },
        "extra": {
          "website": "https://x402-website.vercel.app",
          "twitter": "https://x.com/Catsx402",
          "contract": "0x86F81966e14dA17193CC3F3d6903184730F36681",
          "usdcContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "totalSupply": 5555,
          "maxPerWallet": 20,
          "pricePerNFT": "3 USDC",
          "blockchain": "Base Mainnet",
          "metadata": "https://gateway.lighthouse.storage/ipfs/bafybeig5nm7scghz5b6gjqictzqhz3soxe36f46eiir5ingjx6pflyu3ju",
          "imagePreview": "https://gateway.lighthouse.storage/ipfs/bafybeiaa2nnwqbbnwfansu4gevlo4zmsjxgsivutnsfeat3mbyoxenprnu/1.png"
        }
      }
    ]
  };

  return res.status(200).json(x402Schema);
}