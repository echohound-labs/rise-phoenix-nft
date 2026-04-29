const { Connection, PublicKey } = require('@solana/web3.js');
const conn = new Connection('https://rpc.testnet.x1.xyz');
const RISE = new PublicKey('5QUVVnm1duiRazqa69KW9ZQhCCZcg5GBUKkUn5avA8Gb');
const wallet = new PublicKey('2pKEiHrL84s3G8eQc7uAD4Xted2w8H9mKCVKP99C72tE');
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from('pending_mint'), wallet.toBuffer()],
  RISE
);
console.log('pendingMintPDA:', pda.toString());
conn.getAccountInfo(pda).then(acc => {
  console.log('exists:', !!acc);
  if (acc) {
    console.log('lamports:', acc.lamports);
    console.log('data length:', acc.data.length);
  }
});
