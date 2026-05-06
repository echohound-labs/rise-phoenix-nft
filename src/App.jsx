import { useState, useMemo, useCallback, Component, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { createCreateMetadataAccountV3Instruction, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b35', background: '#0a0a0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
          <h1>🔥 Something went wrong</h1>
          <p style={{ color: '#aaa', maxWidth: 500 }}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '0.75rem 2rem', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 50, fontSize: 16, cursor: 'pointer' }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Network config — switch NETWORK to 'mainnet' for production
const NETWORK = 'testnet';

const CONFIG = {
  testnet: {
    rpc: 'https://rpc.testnet.x1.xyz',
    program: '5QUVVnm1duiRazqa69KW9ZQhCCZcg5GBUKkUn5avA8Gb',
    mintState: '7m8h2Rf5w4UzPqS9EVMVkHwaKhhfvrJiwoc8Qvapkxoh',
    treasury: 'Gowv5PDb7K4a5PwjubWegvBT4CDfjjJcG4QAZWa9yUob',
    geiger: '2dQf9uaCzXewrDNLttmtzQmc3SmqfAHz3qahKQjtGQyY',
    burnWallet: 'C2viBvQtHtSXKATzqfLiZ99RCnVKziBgF7m7dAKFCMU5',
  },
  mainnet: {
    rpc: 'https://rpc.mainnet.x1.xyz',
    program: '5QUVVnm1duiRazqa69KW9ZQhCCZcg5GBUKkUn5avA8Gb',
    mintState: '7m8h2Rf5w4UzPqS9EVMVkHwaKhhfvrJiwoc8Qvapkxoh',
    treasury: 'Gowv5PDb7K4a5PwjubWegvBT4CDfjjJcG4QAZWa9yUob',
    geiger: 'BxUNg2yo5371BQMZPkfcxdCptFRDHkhvEXNM1QNPBRYU',
    burnWallet: 'C2viBvQtHtSXKATzqfLiZ99RCnVKziBgF7m7dAKFCMU5',
  },
};

const RISE_RECEIVER = new PublicKey(CONFIG[NETWORK].treasury);
const RISE_PROGRAM = new PublicKey(CONFIG[NETWORK].program);
const MINT_STATE_PDA = new PublicKey(CONFIG[NETWORK].mintState);
const TOKEN_METADATA_PROGRAM_ID = METADATA_PROGRAM_ID;
const METAPLEX_METADATA = METADATA_PROGRAM_ID;
const RPC = CONFIG[NETWORK].rpc;
const MINT_PRICE = 10;

const NFT_PALETTE_MAP = [
  0, 12, 19, 15, 20, 11, 17, 2, 25, 6, 4, 13, 18, 1, 10, 7, 16, 21, 14, 0,
  12, 19, 15, 20, 11, 17, 2, 25, 6, 4, 13, 18, 1, 10, 7, 16, 21, 14, 0, 5,
  19, 15, 20, 11, 17, 2, 25, 6, 4, 13, 18, 1, 10, 7, 16, 21, 14, 0, 5, 15,
  20, 20, 11, 17, 2, 25, 6, 4, 13, 27, 1, 10, 7, 16, 21, 14, 28, 5, 15, 20,
  20, 11, 17, 2, 25, 6, 4, 13, 27, 1, 10, 7, 16, 21, 14, 28, 5, 15, 20, 11,
  11, 17, 2, 25, 22, 4, 13, 27, 1, 10, 7, 16, 21, 14, 28, 5, 15, 20, 11, 11,
  17, 2, 25, 22, 4, 18, 27, 1, 10, 7, 16, 21, 14, 28, 5, 15, 20, 11, 11, 17,
  2, 6, 22, 4, 18, 27, 1, 10, 7, 16, 21, 14, 28, 5, 15, 20, 11, 11, 17, 2,
  6, 22, 4, 18, 27, 1, 10, 7, 16, 21, 14, 28, 5, 15, 20, 11, 11, 17, 8, 6,
  22, 13, 18, 27, 1, 7, 7, 3, 21, 9, 28, 5, 15, 20, 11, 11, 17, 8, 6, 22,
  13, 18, 27, 1, 7, 7, 3, 21, 9, 28, 26, 15, 20, 11, 17, 17, 8, 6, 22, 13,
  18, 27, 23, 7, 7, 3, 21, 9, 12, 26, 15, 20, 11, 17, 17, 8, 6, 22, 13, 18,
  27, 23, 7, 7, 3, 14, 9, 12, 26, 15, 20, 11, 17, 17, 8, 6, 22, 13, 18, 27,
  23, 7, 7, 3, 14, 9, 12, 26, 15, 20, 11, 17, 17, 29, 6, 22, 13, 18, 27, 23,
  7, 16, 24, 14, 9, 12, 26, 15, 20, 11, 17, 2, 29, 6, 22, 13, 18, 27, 10, 7,
  16, 24, 14, 9, 12, 19, 15, 20, 11, 17, 2, 29, 6, 22, 13, 18, 27, 10, 7, 16,
  24, 14, 9, 12, 19, 15, 20, 11, 17, 2, 29, 6, 22, 13, 18, 27, 10, 7, 16, 24,
  14, 0, 12, 19, 15, 20, 11, 17, 2, 25, 6, 4, 13, 18, 27, 10, 7, 16, 24, 14,
  0, 12, 19, 15, 20, 11, 17, 2, 25, 6, 4, 13, 18, 1, 10, 7, 16, 21, 14, 0,
  12, 19, 15, 20, 11, 17, 2, 25, 6, 4, 13, 18, 1, 10, 7, 16, 21, 14, 0, 5,
  0, 28, 28, 12, 12, 5, 26, 19, 19, 15, 15, 15, 20, 20, 20, 20, 20, 11, 11, 11,
  11, 11, 17, 17, 17, 17, 2, 2, 2, 8, 29, 25, 6, 6, 6, 6, 22, 22, 4, 4,
  13, 13, 13, 18, 18, 18, 18, 27, 27, 27, 1, 1, 23, 10, 10, 7, 7, 7, 7, 7,
  16, 16, 16, 3, 24, 21, 21, 14, 14, 14, 14, 9, 0, 28, 28, 0, 12, 26, 15, 20,
  20, 11, 11, 17, 2, 29, 6, 22, 4, 13, 18, 27, 1, 10, 7, 16, 3, 21, 14, 0,
];

const IMAGE_CIDS = {"0": "QmZesr96K1eE7nNoAVLpSn6t4GRd4x91DQbLWtigCYrLjG", "1": "QmYSKjj6BmKJ1CC3kxYacJzyFNDG5k7DJhjRr7vhfxPoGR", "2": "QmTCN2UXqKbXhemdS3fEFU4CESGbyVxm46Sq9R1J6NmFy9", "3": "QmXBGjwaDghBHEXeDNcjqUEBQHMXpBxrJS9eozpTDRz2Mk", "4": "QmR6UENU1eeYm5ygfoubx6DXHjzc5RwmgyiURujwV64oJE", "5": "QmXfdZS1kLCLTT6qpBRMsekvJUttu6NaagAAzP6ZYjgBBb", "6": "QmTYG6SUqmkFJpCvrw69jkujLo2JueTtqp2XHGjFLp7ged", "7": "QmW3eHiF7Kj9HQY7uupn7tBSHZU78bVQZkBPwvQHScgTjR", "8": "QmaEn27Vj269NxgHmcfGYrmsQDbawHymNzz2h32TDbJ7Np", "9": "QmNXtSkQfAbQhrqBPkeZgz3iioNLwJ4y4ks91WctXz9F9T", "10": "QmSFqtxo2e27jfgULyxT3nU93C18bRaMhGtURHVXkysXH4", "11": "QmUq5d2pJMJV9yLg4WWmQSdcRgnLmtLHC1ywPKbJbNUosU", "12": "QmW9kgMzLiRQ7WoWtKZg5qExJXDdJHA4j2s1G2BfsFTWKQ", "13": "QmZKqMDPYZmoc4jALYycwwxSGawPufLwzHuQuLUEVaifSK", "14": "QmNUXuALbDZAr91MoAinB8JShqzAUyi1b9tQhQ9aPEYDtY", "15": "QmTNrjFoyiHoV82nFofp5AcGo9bPKCKh1CRCtpjjt6Yv5h", "16": "QmTcd4e1tDYFtYWgywmxR1yQnTMaru9FC4z2iyGCpkggBP", "17": "QmTBqDs4jkPPSfQ5eZfP78NttPYUqmqXLJdRUQ6cWYBZuB", "18": "QmajK3s4fV5Ly3JFTMXFvzL8pqFLEDLUVVDw5JWUivixA6", "19": "QmNs2HdideHV9QTeJUAktw44vc5B7KgFKR6BW2M36XpWny", "20": "QmRxwtbRfbZSZ6hQMk9XKqNxFdFuFZmTqYxWbp6DCeeiYS", "21": "QmckLuXzeBYSMoVs7E3BjRHevL7B7dCcM93JGZiSWxkup7", "22": "QmTFJMEteqi3A3WjUCCcDC6PYUTLr4JWkuhkfD66nJLAuQ", "23": "QmZsCmFzHHrgsMC2THzXaKBnERWqGzeGjTbtACs8uRfr8q", "24": "QmZ6848za5z9jLJSrMhCTLDPHuZsoZWfjRWHhyBzC6zRgL", "25": "QmVZVQbUN9Qm8D1VFec7d94wCfB3FpxyuHP6nTmK5vZ4qf", "26": "QmZRctxGM1rTM3Rvee4hBWZU5WjmpcFBzHRJELgqr7uJoQ", "27": "QmXdg312FRvdx2wEsYC6UhxwCB2yDfG7VkxVt4hkbQ4xmF", "28": "QmXvHCDNrVvsyamki5uFef4UKxmXdVBGvYiGzN7qjpsuuu", "29": "QmTq8rgwFeX6avrga7qLVPsBQawD8fFqFJLBy7yzZW4NbK", "30": "QmWT3gzB12Ucf2z4YU7o3qVZHvMFQgHoEDjD5DqYkFZJbP", "31": "QmTQ81BHmA1oBMnXq13vXC8q7ityWowsvZtH1SPQjH1fcQ", "32": "QmTQSxxpzuToZAat8bE8drUQqLFFXzwJYPZ5wYTgK9FMFs", "33": "QmViTMT3BAkSiDnFW3guSDqutQ237kfbZPbcRaqWvrZUjM", "34": "QmTcPNHUTZQugL8Q8tEc62vP5AhSyA9Pqig79vJgd91FNA", "35": "QmRxUdo92RYfBRQDXxYJmT4kBGWCdyQcPeTWw1Xa6gQAWC", "36": "QmPJLhQqcn88kDBjiHCY3joe8tHyVn3oFifNovrdkgDigt", "37": "QmNnDwwvZNnYiaPwmCmkgzcTU8quYE73Yg6oK6chu1fJmb", "38": "QmSiHyp3E7FnVTs1y62TM7QA6gWXTsdwUbomnQunVRHSN6", "39": "QmYULUTpZV78UoJ2LSmWwJDCwhqFPRAqpjb3qEniPAsQSW", "40": "QmXkWPapuMi4Foyg4U2wjezB3G2UBfdufTbM8NZyFuz8my", "41": "QmcKbV41NvBgzQyCGivn425HFdUXpDAAxfy6XstswEtycU", "42": "QmQD2zYw5trk2gX5L9GefQVPGfhCijSy3UStWscnWC8K8t", "43": "QmNoScNQfKaurhdCv4U4Sf48MpJe3VBq478xoLiZdWxLQ5", "44": "QmQqpVdo2sZStLpCyVvkTGUJGvyJD64Mj3ZbDCj4wNN7NY", "45": "QmSU8pDmZNHrAM473XAvqFj31EoupCgWoW5UDBbtuPNd2g", "46": "Qmbfwb9MzLfYBkurxrhjGkZcZ1zSq4M9JiYjgTuv6pZ68w", "47": "QmdHdKZicHDcamCrUTv7x6exoxuVWzbE9aPbARyRju9ZC3", "48": "QmarQKojnK4aAHCuDcUAGn3xn3vDS9qw5J2qT85Gq8wPnf", "49": "QmbWTTbJK8EuereavB7ncDqWhy47vHFKE5vx3YGPfgnHoZ", "50": "QmfUeGAGyZ1xCm7mRSP1B8JqTNPhdyuhowEpA9Q3nUjkwS", "51": "QmchUQgEzcFL5FxkDmbti4NvMXxVeiFkXLnFJvjgW2a1Y7", "52": "QmXhKhqXgjYFBzA4RPv48QY1tkkL8kEbHDa8PH7xbsq2LX", "53": "QmVVmNgAbNkyB9MWVHWPCvCsUDcK6CE5qg4rkySgtiWyhg", "54": "QmS7EmkAuzNQG8mcSeRnPZrhy33FJXHcWgK9sDXVU1XvhL", "55": "QmPySu7PpZRgHErf8Qgvu3ECwkp1rPbuBjWPEJRC1FJqUc", "56": "QmZWcYqPfk4QCTmkCLFp3EdjrK8GfKGEgdahuJV5EjVzDB", "57": "QmWGtvzzyuRyvdmHzeawjguNfq2AXC6BvahtzVUXWZi77p", "58": "QmcfiPejM1gRhDELqY2H5MSfRwX6rnN9ZFXXuhWxZURF28", "59": "QmYX2qRhRPaYLXF5RhVjZMN23Rz9VkUqtfWgqBJSHbk6fc", "60": "QmQrkUNgwR84BHVNHQz3Fzc2VZXgaRm4tonYu4goABcggW", "61": "QmcYSQzjBityvrSpgu9xqt5hx159nqmFdyZFdYzhBSBaJi", "62": "QmQMtZcqLF8yKWtRCCzMVuDW1uHCBMeebPfJP6TWMrY2kj", "63": "QmTk66ha2tjheiazdwni4t5aQBfiNGVCWn1FBw82iEP7Qr", "64": "QmP8fMRQ1agpKQUM3Hz684G1bLRKesSVzi9kF2UrQpuok9", "65": "Qmb1xt5rYeorZf7aApDWq3VjhGSZ5ZZPbYorr5NVGpmVQj", "66": "QmXM19yQYFeZiYDKgSADW5KyTiz9GijMMTpSw2uSArey5U", "67": "QmWSq6FwfU1jmZ7MhQyjbvEkduc3AtkZLM2VbBm4LwbmdX", "68": "QmWRuufPrTRiDZ826DFq5fGKd4eaR2cHmBvZYxc5xNh9ai", "69": "QmNqNnTUF52iz8mxZTLL2efM1a8YScqkiuG3p1G3bptkur", "70": "QmTbrKTme3kKyFaqcrgFZvFWucoXZe11d45MJiLWCFH19a", "71": "Qmeyyy9osD55kJsqDKBo3yWs5Qs1PomQccvxy49NLkRcoc", "72": "QmeHRbU2gidipefpPVi1K4D9hWTbTdmUZf3maw3Jk3dTTV", "73": "QmWSzouNDdS6UpgzwdvghzB6HKwXR8KLWXpdbCmwyvQynX", "74": "QmZPRKuaRkAo29f2L5vyvDiLKfRtmMFCVb7vCHvGtWfFyR", "75": "QmPVXJ54Xhm2dQrHSLJdYPtDK3JwpNn2Gj191nJkgAgbW4", "76": "QmYLr9CqYxUE1vB8fEfqA41o3U1157gGVmbq4DBZar4vaQ", "77": "QmQ6MtHS5R6pMsxLYSpkqb8t2nbFsPxnCPu3jVdSnGbprv", "78": "QmWMjF6tBWv2qDFy4QbemwudHHw31mUcV8jrHDq6M9NThr", "79": "QmRrwg9H6xpLPFiTVsYk37VYE96hMeMGT4hFhxGGNrVYzf", "80": "QmNV2kE8N4aYYi6F3iqVHs1Y5qBA7NwZhWysQ68PcsZVav", "81": "QmRcMoAPZw7PKrAfrtobhNVXr9oH5knBCeRv7zBV1Uit8J", "82": "QmSRAKLDw5UNDvW17P7BQ1Z7Wpdfxb69hVyqxdhCJa5vKg", "83": "QmVFndbFuZva9sNrp8fL45bPxm9r7dLevLdo3bLsRWuKVW", "84": "QmegyS2bAbFiYuz45qsJnD6SD4gDdwPpPmRr4Pm4X1hAXf", "85": "QmP3TurmEaKUR9WSgtShwMgexYwCuo9iijJJmCKu8n8VUc", "86": "QmfZq2i9bvDDYLVmyxSLwN8Yr7umWgxVVZPfZmtSZQmMgd", "87": "QmSA7ZaQhUnvyy7oWrdgSNcd6BmNz1X76ns8Gjph7gSRf4", "88": "QmRFw54V8psXeZsvvxwaz344jnKSykidXzESAsd8aJYrUh", "89": "QmS7EV828RC1wEf2KThdtBdsKeSp6iDZGiAiVuHAazW7YL", "90": "QmRDe8f8bx5M5rP2PzUAdMdDfU6J3iowxgUiVHtgz3M4wA", "91": "QmPTenPaEJ1BnxoVxV5FV9X6VLi473RfLLNFmBvaefGFT2", "92": "QmbqymMCLVJnGdudjpYcFgxAUXvBYNdhMmYSXiCKguQrPB", "93": "QmXGr8QY4wY1xhQAShC7vpmFN6ZzMv83Rf8Rxn9gSgxjM5", "94": "Qmcgocc6Fu2Bb49M9CsF16QR39rHEemD56T8fTwhh4uhtk", "95": "QmVwCPk3xtytqvXaE2dhmRSByKXAFNxaeRrRsaQksbriDB", "96": "Qmf1W7H7XGiEaPAhSsBTke4GdKAqxV9jKV4Hqozi3KMAoL", "97": "QmX1TQgtLN6hwZdmqU1MMRMPZy3M6d4VyaNG8yaGonaCVL", "98": "QmS7KfdmguAouYFoufDCPniofua5ZDVAMyouLDW9uMDQCz", "99": "Qme5GQ1mfXzCkB7iwZ8MBA1Q6HBFffgevG5JBbN7UyyBq5", "100": "QmRNq1N3RSAfrpkgtyepUB3G8sn4Hk1yzLvzapzMGy8MCQ", "101": "QmPe7WdLpMkSC2zCXwQeTuCrZhigBiygkCKXmJpPCqUCUJ", "102": "QmXUMHmf8GEQ8aJ7iNGzQiVej5BHi7BfS3yMB4nEFU7Ueo", "103": "QmcciB2oaKV4ydQNqYgUfvUM3c5vAfj1pfnBjasAHjxnay", "104": "QmPzg9Vir2BgVKj3sYWCfcLRsVHL6zL2VG8oZZbGUei9W1", "105": "QmUV2T8ZawHdKsjhy1Ltj69pYp96MeNoBvtaSaP1L4rnku", "106": "QmTudjh27Z3y6Knezo2kUStKjPKmumPby1akn1AdKA4j8A", "107": "QmbRzfrqX11jqouH9QCQDR6vnqSzY64JHHc7KJps29rYq7", "108": "QmWwJfADdha2LfGdhWsyd8ycrQf4TabbEKQnemUrtP1sAR", "109": "QmVqRELVwHGbzc8YXg4PDSLnVYomGsDWkAvoYyxkVxhPc4", "110": "QmX63NECiB65zbRySpHWQcR5hZVxoiYeCD93z1kKoFcBnQ", "111": "Qmd6ZW19uGUK6uFjTAt6n85ZZ1jcWxX9AADxq9gkUiXL5J", "112": "QmdADsRzNEmy7oigezckysEV54zASumEJ6WVi3UHcSCH8y", "113": "QmSncVUDHdBC5FT51jtj6ttBcFqTE4J6LKAMjTBg98hcRZ", "114": "QmWq34HBFn4N5iuYpDHjz4Ekeq8RGqahaeXDcf8i5CAdYp", "115": "QmdnUYKEZ2rJfuTNZ2E28thCGpQDryYpzXk59MDofEto2i", "116": "QmaFg77dYD1LXLhS1TsnZwmeJx93vQZbjByuELvjtixPkc", "117": "QmafRLw7eVEcZeZNH5KA12HVuaPtGMmVHTq6ntGageWeVY", "118": "QmUwwDvyyCxA4sn36GUmuJjsxMUYrQRnEdJAgCSMjFFzsN", "119": "QmXrGsck3ABN2hwiuePeZ6U46Q6YscyiYCFmhBPjjqWSDm", "120": "QmZ2b1EmLuWsAQx482sAHpsSNgn2RzCRcJLxiRe1Fg7CLg", "121": "QmcTHku65ZajJcT1fTTFbWXyh5wHCxLDFMDwEcCz9BVFo4", "122": "QmNtmXht4C7htxCLhSgSRbPgHeHf149ihtP1d5dZ489TnK", "123": "QmWjYHu9mMBSNy3naUrATE8bn3EhYyHzYBcKbhLUBDtDBb", "124": "QmP4LyPLCTgf6yHVRLpTQKYo241qtLpASp4bNR4ZX6bLWQ", "125": "QmbRDw1vaMac9esUetVSN5ogbgEAvcYZzZbkoibcgFqhhq", "126": "QmNug6YjFZHbp7Lk5i961NNxEggmo3YCo1hAy72mci7h9r", "127": "QmZgSEnfpiQqwKGxCSq5xDoTrC4kDx5EGhVccKvKgecWVa", "128": "QmYExgUpBR9tnhzPzvTzRksPm3FchkArA3L7Bh6my2zGaG", "129": "QmVRniBJnzz9NCZSC9Vq8gcx1angqMKz7Mf4796aUztATW", "130": "QmaxoutSaAx6xDMy6hxzfGyZ4KNdE6FxeWJa5PDQWhiSG6", "131": "QmRRgqrgj1CVirnV9RbG8okTBfETN6cTApHzYCq3yrDNsA", "132": "QmdvYwGicynzY6zXuqgVq6KVFh6TyCJovMBvHN7kiSNYtb", "133": "QmWBa38y2CzPzZKUWYfyRgvDVUcxQASmLUSTeAUaezJjKU", "134": "QmUbQQjqAMyk3fYmy2k5nvhHYKF6rgjHQTDuMNeaUFCnea", "135": "QmbMXkSfupLmDrg14FpEt1ctw68rRXe95Rfd78bjX2BoK2", "136": "QmeX5mHh5RpMR2mSrkGGNSxHWBay2gpN5NozHVSWfEXFAs", "137": "QmVU4LL7Xhd2qZCxqgQBZbW5GNoEK1YM4XDnuBrCbs8sn9", "138": "Qmb45VcwQT3XRUDe6CNCPzgGT1qbfWbZBMz2FS1YVJ4Ahq", "139": "QmeTVBVknt43sbZFfnWpAr32qKqeDy3f7Z5ijFJJna8FvS", "140": "QmNsAxccPhQd8ZNfsiHVXMCKuySRoUGQufwpcY83g3f5oy", "141": "QmZob5FaaoE9oh7B4Vf8gbgzB2vc85Whw1KeBNDjatzCRu", "142": "QmYa6C9aVEVeo76uCcSeoJH2HabK6A5h4UBPTwceY64LRP", "143": "QmfLkPQ4eSGJfezYTUdYJYuDT1DAFhJ6pPfjHcRk8Kujqh", "144": "Qmcdd8w1UtueD92TkohJiT74QBwDHLTyUEt1X7iqk3aDCm", "145": "QmbavYry5NY127DgidbuxAndHK1sUMDoFLGZbJFh52RZ2T", "146": "Qmd44HnrGzYVA52qVvZveqP82SZbztnUgLie4Fn8fSXyq2", "147": "QmQfSP4jpC5QifbDQSsR3rPLx3T7h2QvrGH3N2etwdcx1L", "148": "QmUQGEq4gLV5XPJUbCmVARKMKUzSsFcLZbrh6xQvtAaM2V", "149": "QmcmtQQN3Q2ee1tdH7abSTkRzm3ormvVKaigp1wxdt6Er2", "150": "QmPsXLMEpnH2HYLegt9c312JQin5ikjUFJ5B5FmCAfYujy", "151": "QmUGEvJfJouqTjtazdRCcBvrvryt5igjA3s6dcYFXJZ1Ev", "152": "QmeTPtiZQbrHMWg9qrKaPkyLhFRYjrNUEfuCRpUo7ZtLEL", "153": "QmYGPQPj35xnqSgW8Hy1T19VpasF2qan32CvM2Be5fdpnv", "154": "QmQCCkKbH6fQ48pSaQ1uQVutTtFwaJN2iXt1u2DYmTZY6D", "155": "Qmda8KS1WZmmxPMV9L26pARcvu314Vk5w4Es9i1nZoMgBs", "156": "QmbEjrt9L76AfvrTFeCF2bkecaHcvEQYuub7tCewXeUTHV", "157": "QmaiiccDHJkwjRk6ArsQoFoNxh5rNVoxYjZKatTXJQCPRC", "158": "QmVh8PAw4oF17ySffnrmnwPXPdZAxiYPXHPocY2489gv7j", "159": "QmYYsTTBzVyKwKQsndEFUJwcA3R2fudqLBBjZzhro4MRFz", "160": "QmVLfqJpsm1HmA7oyJyYXS6XMkAksPKUH6GS7sggkfHipi", "161": "QmV6AWUNgS5mS3wFkCqSKZ4uPgW4YfU28nv1Zmq1LFaPcd", "162": "QmbYp4NzDu8fuQpWqZXxqZ85KnV9b3ncXDgHWmySNVGjKM", "163": "QmUXtrXHADUmXxhXdJXuHBEYciMkNxsm41JEYXRhoTEAq3", "164": "QmfQ5uMTXb78oVLXGhF4zZCG1fGHMShkNpxYFd446NvMhH", "165": "QmRrfkG3PBvSDJuVuEdiqU2BP9Q6hcX2uT6m85jRFVvo32", "166": "QmbP12qVrQkQv96jQCLkNrbx68KJpUnW3xzCMY2kCAhwXC", "167": "QmfWZ7BSrZmqBR1XPXNi8XNW9FWkVDkZwZJejBFc8REUud", "168": "QmaX4bc1JzqnkemH7UGR1HR1My3HwKBDZyKPcSSFdPtryt", "169": "QmdaM7k9ucHGY6oL1JBQkC914xTVLjtgtTNqjtb8nvGveR", "170": "QmYmbswNT54jgpXTvMFgzS6XK9tr7S5L2CpphHQLinweeV", "171": "QmYvnwfxJACKX7KeEZ2Bwn6mqMsisbmHcRG1W4rnPjASUB", "172": "QmUKcCbaS8Xt4mPt8peyCiRHGFg1Y6MTKjecfpj5i69rLH", "173": "QmW3tWsHzHyrA4iid23d1BFedmiNHRzY4BgdbcPVpxyLxP", "174": "QmPggpqKRCGe3yJajvma2K4jEqw1MN8LMWVjEkA7GzakXN", "175": "QmeTijNgXjfLMfVc1YwvxQCdWHLpju8pXukxH2MuwBaV8v", "176": "QmZqkM6H7htNJFHhkbM9CBbBv9TusMaFfrMp41sAM4829p", "177": "QmP3r6UP2U8aLAkk9PyqjBfJk4au7P4AQsEEBxenr2hyzX", "178": "QmPR2g7UPZBftJwuNTDJiVafFWWmriaLJPaxGLrYg89a9J", "179": "QmSZ7LUAwgfEZ4L1DzhGqweTyPUkE5vzGAB9VygfdxwkDC", "180": "QmNZpBjGBXUQ1KVVTJ4q87ZPYzqDe6o3cDMua71pxhz3u3", "181": "QmVcgBjaN1k7MyGqFeaJk5nF1AfmvutcVDTFXuEBZQj3Si", "182": "Qmahgh8KHiMcj87Tr7H5rgmj5R48FoMELace6vmSH5BRYS", "183": "Qmdzv4cq6F2XpQUBAXizzvueBWyYeERoXe8A3CLPR4E2tw", "184": "QmTKNdktZDnpyGAexzPe6TK72KhBbV5uTMU13USoXJhwVq", "185": "QmcYmeSfPx91qG2CYLSsEicG4uBM4cLuM65zo1fkQ7USGo", "186": "QmZFtzwt63cnVefzV14LPsGxDN942GpfUm6BdVZ8Az4fvg", "187": "QmQTAHLcy1xXe1LBiBEafx1mf4xPNB1mhrsDgit8oWxnBX", "188": "QmUooCEKqdb6UrPzzFRSGxKs29YudvhVLJUjbrDH2xCHFX", "189": "QmP5nJxDsZvSnUH2Rwrj9zx377qCXiYjVJviiRPhd6e6wJ", "190": "QmXoQ9sULwfxFBJMHu5SvMe3Fx3n2q3NF8nXSy9oM6y8x2", "191": "Qmeph1kwVw2ArVhPayShPLapJmhZHzxD69NqhcukhHJ4hK", "192": "QmRK2RcozeagjJp7eGsie6G75Qi4BsVwRickWR4J3crutj", "193": "QmTvYdQKCU4S9WoFxQdwxr2fPaE6Qmv3qniBP6NkzqovML", "194": "QmeabeR7gJu4kiYM3Y7wT3Yp1KK4EthHx5duoESgMYqcrp", "195": "QmRoWFvLStM16DogvUEK2KXiKQr1PyyDmDDscqTAfJLCHm", "196": "QmRw8TGbkEq419xm7uTA2mx1DDYAMbYoPrv4FMeJvtL9Se", "197": "QmeyVnUccokNzJQZ2vAYTvkrTjRN5UfhPxqqM1LkCTQuSi", "198": "QmNcQwa81AoSLcac2YKBUZuuzPoVKoBzv5FvDsAXovzQyp", "199": "QmW2NPZez7fU1uqEXWDQp6FATj8ccLa7YHnenUEcs9X9er", "200": "QmUXueKax3b2YrgmaPcDMTGWceVBswrM77hQh7t9Q6n38E", "201": "QmWJNvzTt5H1N62qT3rn2xLnPHR9ZKAT5HZWH6jV8GyvuV", "202": "QmSzhwLHcWqPkaRcvSb3CYvWYXAfgtVrg7ecbVvcFf1QQs", "203": "QmSdVFtigGFXFedr75hXk3V5xwzPqQnUCP1MDEK9dySi8M", "204": "QmPTSPHx5jq87XVz5qgesAVcVCqGmwerCBgfC7bQw5PMvT", "205": "QmSgEbT2Tny933UK6meURsPSnXAigsumZq2RUmunkMR5vC", "206": "QmYC82UJzp6dGZyybxneKXcCZuJGvfT5yE69MQvd3VKZGR", "207": "QmQPwTtDTuhXmczYefTPxCAUFwQp8kSfyjKGVCtNXF2JH8", "208": "QmQQXoKPJ5N6PHTDa1fxKMkpJWVHQyiaSbqVnE52ujfd1W", "209": "QmWTQgdYxaPs9QAHBNKTkuUSwzvh6aNjRptj2qmTRsL48F", "210": "QmXXE1LkchjfcdPNp2AMEbZQhfXzPAh91CwGzFBSL5hJou", "211": "QmNMhCEDmBMhqx6gRKxeh7iNTkHMnBwMb511H8DmLv1XHm", "212": "QmZkBY7V6TM2gdR1KKYSMAQPWpUpki1ohqXMwonze5Wet5", "213": "QmX5N2sKh26nXVDeXmns2Yuh5dsrtucoFscDgnv2jWk4iH", "214": "QmQSf9sei8EoVVeiv3gr8Dc2NMVCLo39UR4xeDMPzbzxYK", "215": "QmW4oNUmiNKT7Mh5y2RNFf66GG6gfrFGuGBMLdvyjuZsFV", "216": "QmeCmTr22TxBffpbU6VihUnRA44JvYtR85DrNHbyMTAA6J", "217": "QmYodXqst8RHtyspgyj5jDLRg3qF2nM3pugjBhXMCf8gAZ", "218": "QmNnpwoKCPXS17ExV13vff6ECYhFCY9kR5gYmn1GsT9s1B", "219": "QmZYqc3bfcquKJ31qDUGs8Jn22F36gGhcoVrw7TNRssFY3", "220": "QmcsHqZCUM8WfaU9GsEBFSSbhbRXEJY2sWT1TYq2MVfg6v", "221": "QmTQn5PBZuBvjtLR9ZP2ioyErYJGaXZqH8dQRApSTshbzv", "222": "QmQXHZHHBpx2z4sZrjW2rk1vE9yUpgSmJv3Ctcj4vg4y7G", "223": "QmSXZdRegQjuVKQxvmAfDNtDRfhKD3P4zxYPkYKxa7Txiw", "224": "Qmb5FR9CeJ2AbUQYyAYkRB3eM3R3J8xfVwK7u31JdyRUDH", "225": "QmfTwpq5L2Ka3UpfDvcQXYEKn5XgmyLxFhRCH7wBu1XFxB", "226": "QmYD7CXKAH2Be1YSqFh71HowhpiMGJDpeCFeDDrMtkH2w4", "227": "Qmbjk1gcrYB2yNYmVx99Fvb3aG9moVRdUd7ZVWZi9K9LVy", "228": "QmXwCjDuDVHtmbmEpn2x5K5qUmqSmA8731mVVfopy1XrRu", "229": "QmW3iQUcBbN2UAdHxZiJ3GxVmoFReWBChc9LbctjB9za4E", "230": "QmT6FV4La8fGvvY28Gw8TZ3xZXdJsykut6MpjpMmXkTAd2", "231": "Qmc5YEFvrfJJsacjmLq5brfMUeNuiYzRp2Zp3saRVRPwPF", "232": "QmPpWu5fsLAvNRG1rLeQv8fghENd6bf4kmRgJpBJ4TcjHT", "233": "QmbkHXXyMpLmcb5irhGTwRuu6n4CD5ZUtT4xFYdw2eemN9", "234": "QmWVTRWT7L2QqJmRyCHxqvMzcCmyBwdiFCd9cXTcU4j9Gx", "235": "QmQpEe8WFRTsqtoWfm4bpqjoUrYppomHDnNXbJHPrmeKqr", "236": "QmdpAnk2tMJC92fyMwo1cBbG3FVc5AHmdcLxyk4AuBNT4V", "237": "QmQwRhw4sUnGmjB3V4f3G2ugdcq4L56buvLoo8U7WCDrPt", "238": "QmVSDTW63MAWybq5AT995iGL6xcaxLhSNpdkxLomGrGpD9", "239": "QmdW4gQv1Ny9e195CZEZGmEVee9BJ5P5H9fr1vF5PUv229", "240": "Qmeq1Z1WjK3Zof7ZtCUAWbGj4tWqYt7wSRQojaQcVqEBCW", "241": "QmaQGcnjj5zATz1c1HH34rmttkH75iHfvjHszTsjr31GeS", "242": "QmQdUxJLCEhBy2h98uQq57r3n7YMkUh2ELWak3Htrhtfjg", "243": "QmUtR2MPbAiV8tRe9uRqkpnE8SV2KWWaaje9jtrFeAywoE", "244": "QmRKuMsHgb64CKnACnpRXsf2HKCvocqQDnUEnyzbARVAL9", "245": "QmR2SEjGn2gkLcKNWfYFxEX4DkkK6hfYbZKLbZqhSrbNjy", "246": "QmTaGn9YqMf8gTduuowkFKX8CQVjTX6Rp41nAG7nrmgT4t", "247": "QmeML4EjeBAaZ9mQD3Z5EYYGgBmD3oJqseDrw8yQ7JTeJe", "248": "QmdovGadWYEj9ajx3CEKhzjre1XT9o565dL8NyQpUhKmCQ", "249": "QmTPgMVrpigzYN7vtVALxR57WmoUZUhSVHgortRgLjAGGT", "250": "Qmay5KSuSNatbeW98R9yaq5qDC3qm4gjrfexFyNgFkEZ8q", "251": "Qmd2sVJP2xW5LJt9RPD8ftB7oWr2cUCra1hur2Biy8aA6M", "252": "QmTxLfPww5gRUpWXVfEYSbvtRm4BMdDgUz4u1eQeyejd8H", "253": "QmNrFFQ56gdCbLLpw4J41YvVHsmLLPBep6RkQHzPSbc7cf", "254": "QmbhCrKiguD4zn3hK8Hmuu1zPVzV8FXdtzbqh1RBnKH2zm", "255": "QmSmvwMhNGurAqBrqMMQcVcpRVuvH5zaFxmCGX3b6CYUSk", "256": "QmQiRR9iUKqqtQYmRNvvXZDHSdM1Wdcf6CS6fCxJTFGFLD", "257": "QmSatmouYonY5Mte5rwbrwqgzrdXDWrpkNEzRs8munvZKt", "258": "Qmbws9weRZWHC4fVEKvwhHAYwS5SpZrBXpG8CFkLLsbmKq", "259": "QmT8mHgexFDUPnFCwBiTyyoGpiCwcScgXfHEqikshjaBLJ", "260": "QmQKe44MftAmXa5798AL8Hv2kBBxKVNtXjPdz8PsXGoRb9", "261": "QmfHwhRX7EfMFimFrRKx5CLitVDhNHheBn8YywjiXims7p", "262": "QmeYuk6KiEApSrysAe39DXCJxzRdBzmvfBHzsgik6Xwisb", "263": "QmUoYxfsTScn6iunn1ZT2Gnzy8nDRJKeVDeDfh4nVs8Wif", "264": "Qmbs7Z3w4BpNznLbCDCheA7eKLjJG3BckiEPgxecdegQKH", "265": "QmUSud4KDH7K97LhNh6NwniLn5AW4NDBi7twYcgwbATirt", "266": "QmUPmgRZqpatgqKGW8V1revSXAYheQvFcXdGtnbF6EAmMt", "267": "QmNQs2f9pz4ENFKmQAdRzH6A6sFBBp3qFdzH9CoiX9bAdQ", "268": "QmTZWkyagWCTryPkWxGK4EzsWLJn2aaU3aJxBce5K8DZkK", "269": "QmaqVUdmJtW9fJWSkAnNoC7ypiQF6JgaZjKMRGVmDE5Zmw", "270": "Qmceo9of9C88qBZVXcgAgv6P9uZRBp7SKv5f2NZTC2J63s", "271": "QmUn1JrN9diCshkmpU3ViP7YPWsrEhrQdjon7BrGLzXREL", "272": "QmSn8mqGJHwEVqUK7oXuq1nfib3agLwGGb6Zd69bV9BuJK", "273": "Qmbde9uNSYp9Mj552ykXVw4NntCGZTzrzG5TmuqEMXeusy", "274": "QmXaiV2uJjGuqu4casu7Q7L2PvcpGkuiSFXBSjRaxfb6AK", "275": "QmWF29B9Zayz9LvzjQWgkssUTr32eALuv2uHtBvb6NaSqT", "276": "QmSwEZZM4FNnddG2ScRoCJGxE55gbhSAzSxDhjR4RzLfRH", "277": "QmNtnuovx8MaVGYFugJAtDWf1StzpY8jyrSX2tVg3x9NJj", "278": "QmdwYE5cQU8YukvB6m7Eja66vzmFpz2Gr6rPFqayteLyS8", "279": "QmW1jcQL5o3M9ZY4jvebgPBEC4ef2tDBmtjg9Auwxo7PW7", "280": "QmeYuWBF7VbiBZUk6M4fKSiPsEqWKbifB4vJidG7edeuzU", "281": "QmYtmyH74s4PsKYj74JzjFCSzuBYc1zQZxibiF3sgHDh4o", "282": "QmQw7fVhjpNR7x25k3qjk2GZXJ8623SDUYBdrJvxY8QiK6", "283": "QmXXBQfeb8wAVPyV4iArNxvnY1sCaqKvBvc3ur71jyMAcU", "284": "QmUgnF3ShhS3sBUP6q1hnSigiTpMcyXisqwFA7cZ3BHaxv", "285": "Qmdd2PTXwGWqRPyQi4WkFhcJpPPg9cXDKYzKzzc88ZsQ39", "286": "QmQkU3Xqxpyt29yTAUFLLBkUwZfdLfAi4YE6aaY2i2wEZJ", "287": "Qma4C2iEFGXApfXi17rS8dBjHFVsgBZ4m1R8YMHv7icUhR", "288": "QmQB9dcTToBmAifzD6AR3AQJUfcZYoNCDVN1brVgMR5WtU", "289": "QmVEBj3haxjt222YQew8z2i32nkNG9t6tfjYBSztcjsjFW", "290": "QmdVoiHWAJkgdukwnjxrb7pLAP8vAwCRb8g9FhncceUcfA", "291": "QmUaD4pVhHCibr451MuRn5qNCw8i33xxVRsud935FskcXY", "292": "QmTjNbKPnLRUe9n2yGxzhwakfNB1XcdAPJTMU3oP1Swumm", "293": "QmXM433y6ZHr4SJnshVPQLQt4uJ5cFxhSyFnqcv2rLgDUo", "294": "QmQYM2SLHfP3sdhurczLHsAdcBf3ndcPKbqNoTQZ3Gm5CZ", "295": "QmUFr46f75BqHESZ77pAFKJCsU1DB97qSBpWV2hdqaxNEi", "296": "QmTNJTgAz2gQvHkcwWUwPHZNUuhHSZJFDJ3F9zAkkKpshz", "297": "QmaAKYCm9wPdbKtCQUmX1eGTXwDyEkdcJcR8VxAsHBDdXL", "298": "QmVSDMeVooyCUwDkEUNKRoc9cLmDVr2dRa3LEFogArivh1", "299": "QmZtfnDoNxQBVg2LgP9iCAkFNyVduGsJb9SviXJZsGkbE9", "300": "QmYfx3jB6no8QLjPfdKNrk2ex6Dq7pyFaYfiRvdctQNKUq", "301": "QmYnJ8KW5XfQjMVREqD4MdriXxCn8CRWoczNoCm3rVtGVe", "302": "QmSAuSFv8kyNpX86hyB2rhxDojYVzy4593NsnrXUN1y6uT", "303": "QmXpmA54xF2Gbrx2xGyvbkfGPw7MivSQ9P8FDv3m5XMmqn", "304": "QmVmRK8BxsGNNU2qbZiZkhnH7QEgk5jvtMucym1coaRuiZ", "305": "QmX6Ah5UJMYyphJu588hJb5jEJKkNgFUhcMTfsmkuELvh7", "306": "QmWch46tcXTQsSaWAnBAc1o8jvw5WqLBrX7jsKshkECbf2", "307": "QmZ5JtebDt4c2T9hYBhbsgEwaDFi7yr77dSjjcAdU2wXie", "308": "QmVV43ZNXtBWoyAYiPPonrmLc9QWgb7G4UqWwWx7appyLw", "309": "QmQjt4ippABh6Qwv7ns8XjuRtxqWdhjYGEN3tQHvMKu5JU", "310": "QmSKHcYK1AtSJxDTzWjh9L1FuqXQpAY2HqkwPnyhay8Rqe", "311": "QmcvapGg9juVTMv4S2Tvbjd9mLTkQaCWSPiRBB9C7ifgwK", "312": "QmU18AdLn6xmvr9EK4fmHCWPQSoDuVihjsnKcc22QmLpbE", "313": "QmXywLyTL4HvzNbPUiEVfi6tR44D8WrF5aUSHzf5Jtv4HV", "314": "QmXY2ntYUGhCu8vAwy43wTyN6gtFDeGw9k9N36mJgXCDZp", "315": "QmVjaUrrYYttP6jgGy9dDoWaeWomxCgxSANgDsKCzy3kzG", "316": "QmXVmE3ubf1P5CAcwVrPY7ruRaaKtY9dX2ejSqtYK2a2qF", "317": "QmVQDxYayYc5c4ByShjiaXPoJtehuWsFaZ1bPaVwii8kF5", "318": "QmWLXq5rCEDCn4M6Lk9TX5JZoNCTTvMkr3Ug7bsf36rgTM", "319": "QmXgcku13P4BJsYwkmfG3FWVnd6oSRvsPcsHVetRBCYG2m", "320": "QmR5GfQ9zE5Q4hExASj3KHaWyeuDFGpKxTNM4GW89Cp8C3", "321": "QmXyXwAh3gBDMRWnZ8LagG9uNU6TA5euLwQ2qTkNp3HUnu", "322": "Qmdyj1fgbZ7nxCsPPg4px5613J8BnJQVXeZR5M3JBbyWfd", "323": "QmShZxeW7i1SzQiZfvGwEZhA2Xdzy6s2KwB2z3zgpFbLq8", "324": "QmbL3zHfM5m4nEAaonWa9AEZCX7cBS8h9iQci2PDueLHwG", "325": "QmcDxyaxrbkwHzMwDQUNQ5bQ7JSr3ZBBvP4GfQZrNbqD8o", "326": "QmcmBfCn8qmbh7ARwS4UBaxjHGpdZijwK5WNVx7B5jermh", "327": "QmeKbtZTF43GZSc7vSzAgGSYWKPquqGgYpBRuFW2MdCtkP", "328": "QmQL8JdmLDtFKCspFNFgtxpdmAnxF4KHQGBzCDzeUwneA8", "329": "QmPjMxzhPrSpgTCTuFFKMn8XSR2XzUCeSVB2DcD52U6pow", "330": "QmQ5h6c5DgvxQm6mEEVbA51Yjunwvi7AuaiqT33D2HSN6W", "331": "QmUeRU2Yx2vVBk7AQRJoptNdJAwT553owfm2v9HZwc9zBf", "332": "Qmer8LwuQ3z1vMgrqwuhKUoYXRHXYX86r1CkH9hWjhMD4Z", "333": "QmZ3NF6LjxGiPxTYhpRDViWUdLV3sVh1Wcvtuk8Dq3xRJx", "334": "QmVW9HcQK55j4GcmSfNfTisdcxRaXkhoJ1oSEugphx4fRt", "335": "QmNPMNrReAyuwP43D4QMhUjT1ftPvbbDe1SM5PzU57VAud", "336": "QmenNVkxtqRRqy5oCcT6BkfzehdAdv96aiy9ThUAavFTTi", "337": "QmSus1Zuq8jTYmY94BkzoaoJnLa13CmZJ7mMoML89YCqeX", "338": "QmUgou4FaC2m4fMXjRoqAX6v1DEFytEBGhD27SU8uZW3Gj", "339": "QmeizXcbjUfWK8S1ZixJa9uxcmWq8RMMYVqeQaHuDG2ueP", "340": "QmTqV4wLq88QDgGGQUmPM7hAuAFrgvu6vou3t9g6yRb8FU", "341": "QmParzY8adNQL9rBvAwrqVeqdVUuYjvemMkGzBymLYo1HK", "342": "QmdjuY4xp57ZkC5Kac4tw3bqp2Mb8HESJX49487cXWS6Z7", "343": "QmcAT3tLZwfYENmxXrNLtntHSQ4cuNn9jikGVTehbSopKd", "344": "QmaNULco5BcyzE17GMsoPEphmRLWaBsx16FsNxBPXRvUvB", "345": "QmQu6CRVWgEHYMisy7sWKNJu4ZwCZbZyGvRrja7sdt1wQL", "346": "QmdfERpCUSpDhFxo1b6u3K8EiSThBkJzc6cFznQVzuK9nS", "347": "QmfUfAYkp7bXfHYZ9GJZuSVoXs1ezFbBycmPYycdvxksTQ", "348": "QmRTPqFmN1U5ehbDjASX4SeqtPsdzoUHuhiH6DfifRiasf", "349": "QmZnZgaQvdctPRfRsQVp885nUcC8FAzRy23x2JSauyNHV5", "350": "QmfWMiK5Qb4AbGXQ3ZmMxuRZwJParP3LivNAajSWo2Xozn", "351": "QmSam8dRsYan36SGgHE1e1gDvMCnt8uEhx2CmtSjX53Srh", "352": "QmSFxgdRHxTRBkcMcNuUH4k5ogzuHVTU45rHW7v4StQjXb", "353": "QmTDhMcsQgMH9xqcrnw4Eqp18gJ9UesrwMefMwgCfVGUf4", "354": "QmRHgDgjjrC1pex73oW7fxhVso6jW6riRtYbBtqivWa5Ks", "355": "QmSrnUMAJYb78UWdohdx7e7QE4RfJa68ob1cj3RQhyujAf", "356": "QmVw5RLtrz4hdeWinChFegDZxKQqCBnmzKyWCLk5VyUr9Y", "357": "Qmeh8F92Jjgzk2GKUheD3NJpwHdSHk33VqMUtSpy7Q9yPD", "358": "QmXw3m3uBwvSvALXVjkmSH3fCuorjG4w6yYxUhRyNDWJJt", "359": "QmSYNQ2Npm5RFgySJ67GW5tLV6CJvBE33H7zTbHfpkZABU", "360": "QmZesr96K1eE7nNoAVLpSn6t4GRd4x91DQbLWtigCYrLjG", "361": "QmYSKjj6BmKJ1CC3kxYacJzyFNDG5k7DJhjRr7vhfxPoGR", "362": "QmTCN2UXqKbXhemdS3fEFU4CESGbyVxm46Sq9R1J6NmFy9", "363": "QmXBGjwaDghBHEXeDNcjqUEBQHMXpBxrJS9eozpTDRz2Mk", "364": "QmR6UENU1eeYm5ygfoubx6DXHjzc5RwmgyiURujwV64oJE", "365": "QmXfdZS1kLCLTT6qpBRMsekvJUttu6NaagAAzP6ZYjgBBb", "366": "QmTYG6SUqmkFJpCvrw69jkujLo2JueTtqp2XHGjFLp7ged", "367": "QmW3eHiF7Kj9HQY7uupn7tBSHZU78bVQZkBPwvQHScgTjR", "368": "QmaEn27Vj269NxgHmcfGYrmsQDbawHymNzz2h32TDbJ7Np", "369": "QmNXtSkQfAbQhrqBPkeZgz3iioNLwJ4y4ks91WctXz9F9T", "370": "QmSFqtxo2e27jfgULyxT3nU93C18bRaMhGtURHVXkysXH4", "371": "QmUq5d2pJMJV9yLg4WWmQSdcRgnLmtLHC1ywPKbJbNUosU", "372": "QmW9kgMzLiRQ7WoWtKZg5qExJXDdJHA4j2s1G2BfsFTWKQ", "373": "QmZKqMDPYZmoc4jALYycwwxSGawPufLwzHuQuLUEVaifSK", "374": "QmNUXuALbDZAr91MoAinB8JShqzAUyi1b9tQhQ9aPEYDtY", "375": "QmTNrjFoyiHoV82nFofp5AcGo9bPKCKh1CRCtpjjt6Yv5h", "376": "QmTcd4e1tDYFtYWgywmxR1yQnTMaru9FC4z2iyGCpkggBP", "377": "QmTBqDs4jkPPSfQ5eZfP78NttPYUqmqXLJdRUQ6cWYBZuB", "378": "QmajK3s4fV5Ly3JFTMXFvzL8pqFLEDLUVVDw5JWUivixA6", "379": "QmNs2HdideHV9QTeJUAktw44vc5B7KgFKR6BW2M36XpWny", "380": "QmRxwtbRfbZSZ6hQMk9XKqNxFdFuFZmTqYxWbp6DCeeiYS", "381": "QmckLuXzeBYSMoVs7E3BjRHevL7B7dCcM93JGZiSWxkup7", "382": "QmTFJMEteqi3A3WjUCCcDC6PYUTLr4JWkuhkfD66nJLAuQ", "383": "QmZsCmFzHHrgsMC2THzXaKBnERWqGzeGjTbtACs8uRfr8q", "384": "QmZ6848za5z9jLJSrMhCTLDPHuZsoZWfjRWHhyBzC6zRgL", "385": "QmVZVQbUN9Qm8D1VFec7d94wCfB3FpxyuHP6nTmK5vZ4qf", "386": "QmZRctxGM1rTM3Rvee4hBWZU5WjmpcFBzHRJELgqr7uJoQ", "387": "QmXdg312FRvdx2wEsYC6UhxwCB2yDfG7VkxVt4hkbQ4xmF", "388": "QmXvHCDNrVvsyamki5uFef4UKxmXdVBGvYiGzN7qjpsuuu", "389": "QmTq8rgwFeX6avrga7qLVPsBQawD8fFqFJLBy7yzZW4NbK", "390": "QmWT3gzB12Ucf2z4YU7o3qVZHvMFQgHoEDjD5DqYkFZJbP", "391": "QmTQ81BHmA1oBMnXq13vXC8q7ityWowsvZtH1SPQjH1fcQ", "392": "QmTQSxxpzuToZAat8bE8drUQqLFFXzwJYPZ5wYTgK9FMFs", "393": "QmViTMT3BAkSiDnFW3guSDqutQ237kfbZPbcRaqWvrZUjM", "394": "QmTcPNHUTZQugL8Q8tEc62vP5AhSyA9Pqig79vJgd91FNA", "395": "QmRxUdo92RYfBRQDXxYJmT4kBGWCdyQcPeTWw1Xa6gQAWC", "396": "QmPJLhQqcn88kDBjiHCY3joe8tHyVn3oFifNovrdkgDigt", "397": "QmNnDwwvZNnYiaPwmCmkgzcTU8quYE73Yg6oK6chu1fJmb", "398": "QmSiHyp3E7FnVTs1y62TM7QA6gWXTsdwUbomnQunVRHSN6", "399": "QmYULUTpZV78UoJ2LSmWwJDCwhqFPRAqpjb3qEniPAsQSW", "400": "Qmc9GuTeHjtKjZtJHbx2NNxP3q2J4tduSnBKJiJfzd2T6T", "401": "Qmd4rg7Troht24FTV2RWD1W9BTFapkCNfrUeAY7CCJRsHT", "402": "QmYNfTjV4m5sXMt6WkuvFWCM3M8LrDUGGD8UvzemWAzYLn", "403": "QmNmgHAogv2Tfs3oXBUKyGw4jg4aBbyq7aQ36G4R8owms7", "404": "QmcVN5gG6d9eq6EJGcBk56LC95BqRTbRxX9ZEYxUNDaaEm", "405": "QmRcfR85PedeeKwh8u9nM6UpcccPGVwmw6iU3PeebkQfzw", "406": "QmW7jpehcVMWdoMeKXX6LXG13h5ravhSempqMsGXBxJUkt", "407": "QmPnKEc4tJjFp4JzCBe7WDzpnnyYWc7B1jvSDNXn5eTzdQ", "408": "QmUAWdgzq8EkNnQJBQa8md5UTb1kC4kKEGPtwhkFkorcdF", "409": "QmWWQBU3B1qC2ZWbcvGw6vSEE7ifpsA2fZgbaDJV3LzF7x", "410": "QmSwAWdXXe5yiNi63NhK62B2azamcFTkJN56f5XTQPgzJg", "411": "QmVqvQtZ3b8ZsxxXwAsanPHUyeMYQKU29y2Y4BosxdfXmA", "412": "QmaNWuEeCEsDAWSCkMhYt7v1ojNtxBfgS1M9bbsjynaeyc", "413": "QmPkm9wLw9Zi6pNDwDiM2SjkAfpHf1iszoZeo8EhzEMA5b", "414": "Qma2MyFBzrjg7xT2ere59zmTFDMYpdLqPseQXF8AVhF8ee", "415": "QmamwpcN9Y99AwnyCRQ4XeMop6WNvEVwDnFAo954z9Vqr7", "416": "QmVzfwQ9aG9YxKRuvo8rw4hpj6u5vrTgPMe65yJzELfa82", "417": "Qmc7gsVY8CsFtrkhUT8X7Q5njcrLH8nAL9MdUR526SEFnL", "418": "QmPMMpvuN6eHrBAL6t8N8pb2bcPP1QbvkMZA5j6Djan9xe", "419": "QmS1U3CFWvNKD47F8yoU4m6qUNDwAXtjuaZJFvz5MmMeJL", "420": "QmVjdJPcYErffF1HEmbfwitewH85Qs95YHNrecXwUcFXtv", "421": "QmQ44GS4vFj8Mb4ESzGLbtoA6cjYpRBkCmK5uxgWuzb75R", "422": "QmThpw9moiVf3Y53ndsgss5MoMNcpUsK7BnK8hsz2SBVqL", "423": "QmP4J4YxRjDT7xfFpEgUfMZEaDvs8hY58VjUyPPDCFFgwT", "424": "QmNfMKNrgX5g3SRquwwnouL2xDkHsvUKu5BYAphXzEYpfL", "425": "QmYEQQFHXTCsR7demng5nPCYdjaCZBd6QiL3YwpV9RJKVg", "426": "QmRQFQBaXv3R127k5XfJUfpxRiiaJAxhFua796bjgtxphy", "427": "QmbFq4U7YtWH7NU8c1HUx7YEsfvH7z16DsqoXoGKMnMNJh", "428": "QmZREqtqepharDgjshjxfeVpgR89ePyKzihcSZKybttLrX", "429": "QmXzih6oV4Dguma1hrTpBcg3PquMDMgdfybZAUjTE8zCft", "430": "QmbwDc1vhjttEEonnbj6uNXDHxXpQEE1rY6w1TEat1kTEp", "431": "QmaAwib2HaumCY9zCbWa155VQYGr4HScJRyerL4Qqfu7pH", "432": "QmVAKh72mySqrewXZDJkEak9DcGEUBAvNSnW5D25Ld9Mp8", "433": "QmWcn65sZecajYMB1unSt5AJackM9PPKxUW3bAeVwYNhWi", "434": "Qmetim5wrymSNCjjJFLQmDNLY78rUZeP2WwmDmB1FUu7if", "435": "QmZ1mj92Cj4E3rb7ZbJnDBET1chuf75ncWUsMAsHnASVLj", "436": "QmQ7P2qdxLb8hZyUibbDQ7RBDCR87CfKEDX1A2fnE1K1kT", "437": "QmYcugifin7RqGTwDhg5VxvZUz3LWiTTKBHpaT8rzhusBP", "438": "QmX6pFL8UUWDtNKVNnead9eHKwhNDJsVRmj3eG6VhhrSRp", "439": "QmaZMSwN1Ecnh46q2QcnosTm22MUsXL3GQKVxF6g5sXfP4", "440": "QmSBcfyWHCGKEANaBXc8W12XLxzZfY2H8Ak9odQqb2cPfE", "441": "QmRgHXnt4bbPfFFzCdV1qXLUJEx5o82M2BAqiZs6BANgPU", "442": "QmUa4CV1H4TiLXe1dgrwBbdFKp226Jvd35kqQV6k7BABHf", "443": "QmcVim4H8ijSMgoiraTZJbVUoev231GwUdkfszrvw5TEpY", "444": "QmSb8pPfjJLt714Tk929H9bF3qqwXSiNE6UMyRe2GTPKy4", "445": "QmfJb5MLwQ4ovAc36x1LBFcgJadrmYkKJnC32dhjWQqnVa", "446": "QmViEcsYUXdQevTvD81MdDzsQidguWMccJxjBoohx6cxwA", "447": "QmchcqjhmsjeBQXVhvtg6YDN9qTjQXqovgUUxacREoTgoD", "448": "QmP6WLYpkcNaq89pUuLcXgdqspGSfEZJPG5HtDvE1WJveV", "449": "QmcgZg6m1hSvaq1h83z526abDc2qwFMGBGCnaPdHwExr9P", "450": "QmbM2gWEpmeByRd54mL89i93vuT6XBsQcJ1VnoPSH4sSbt", "451": "QmZywoYKNx9gKfmvasZUawjCPYwH1oHarqZcABmCr3xxMj", "452": "QmWVr5zZaSPV9eJd23T8VtW3YDHsjriR4CxMXDqpGv7QdX", "453": "QmdaQVAwoieTVufivNnceHDiZxQSoHQfRTiYav5Zo3hqFL", "454": "QmReuoaXPULzap7tKVvFN4d1q5kqsh3tiZc5VCMURGZXav", "455": "QmQRYVhB8M3wPRuonYFCBRfRWc7GYg9r9C6emk99S3bhiZ", "456": "QmYd21Va2fbWARK39kaJJpowyFQ3WLcvbhTdgAoni8EVBM", "457": "QmRVhrnGFfp2b2dxE9Nsr8bfbqoAHbWmky22MAymwqt2NG", "458": "QmXxbKRsGTLtLwMA7iQc6CLJmu9WuK8JHPHjV6repcW5t5", "459": "QmYQpRuMGqVbsvNJqmyjVv1xdHztELonKKRxGi1tt58u73", "460": "QmTbmXQdCSqYd4KexBuqNMBRKHiZjMMZ8jVygHDQNmMV48", "461": "QmZUCA7V6gTCdDXx1S2k7D7TJ2wLNWsiFGpcosoa4GxhMk", "462": "QmWw7BipkdHfrx4es5XzTWsP8hBUDQDpc8NHLxjpM2RGw1", "463": "QmXSSpjT8hEzX9zUX7oG7kCiQbj3nA2x4mgGs3V4eSUW18", "464": "QmVNtujToHaeN3NGjDsSsErW4UGxwLggkoRXv6gXi5qeyp", "465": "QmemuzKppM84EwAQ3gMN8nfdf18cgvnsgHLgpZ6n8YHTDA", "466": "Qme8AX6nE5yhZcFk9wJG6dkf3emnX1FyD3seFGGGc6AuF5", "467": "Qmaj2bnP522oZ6u5HytWznmtFAyG3Krgu3ZoerZbR9C9VN", "468": "QmPhcJRF8Hue1Nm6991xEhw6kemBxxSGvf5Gb7ZF5pXH87", "469": "QmSoqye893sLMxaDcf7mjoJobzR1MXtJTze1HXk9MQL3dr", "470": "QmYgK33F9jWUjCMQ2BCYBTBPYdtzu8wzLQuF4Wnja5EQRk", "471": "QmTYagqmYQqEqWcDXxdJJzHvdQv7JvbZszPrYdkN7JHnyV", "472": "QmV485Lw4Uq97Ev5H1faH7YNCbptKCdBDkCRMXykPA687i", "473": "QmdbpuY9p33EW7NBddGYsjoxj97pm71WuJjNMMszYPxuLA", "474": "QmSPxh1kJ1w25jg8eDwFMWpuZxhZCvw8cTs3yqKpL7xQiP", "475": "QmXbEQGDYqPdnnxjeudi27NkjTTyfv6keYxBNxDuxEBaPf", "476": "QmNxrS422S9PhWsbV4xGRqm7PfTBQ1NtfaCkzbacD4bkGe", "477": "QmedSK2rEszacSg1eYBkQhsjWvzSYyHvP3GiB8HvAqYfs3", "478": "QmXovWRaRTbcDTvtxZsYWAwRankcBP7FotV3yVgZgwjgxS", "479": "QmW48dHRbPsAhGjAKHRyUZzbDmQe5bysuEGmbCV1Yndp4N", "480": "QmQPPYzDBDae69kYan8KX7piU3nLrrQs4F48FhqVzi9zMP", "481": "QmXNXUtQKo5nP16Si6VeB8KA6XqoKXTUobVx4JjvWFJuev", "482": "QmRqWz7z9ZLx8FwbkDb14qGqA5Xf2bAiaw9RUz95Hj9bUC", "483": "QmS5DH5JohW99AaBEUPjMsQgVBaK3CT4tZDYeKxZMDxY9G", "484": "QmVxwnxNSdSrWRqQ4PoUKdwSYpbE592Uch14Ns5vBtaTqo", "485": "QmXodf8NhdATbCf5cYW6uhNWQjskKGQUWMh3fK5Svb9pMN", "486": "QmPqPVeP2N7dpJzJpsmEhnf1Hw1fTBStWmBg8S9pPUqXA8", "487": "QmZ8A5zAwfxd1c2escGKQXQUdCJ7fzgHNxSboWQGPBk9tP", "488": "QmQ8tTDRvSYSxGQN5qhd1933qCAmA6kLZNQritTkhffsS5", "489": "Qme5FJAfJb27v8hYt15v1J3XGem7DEWVFK9BfwpEvLGLRf", "490": "QmPL2hByaCahaWDNvyez2khnwqTbsdss1WwqXqWgb5b4eN", "491": "QmYhtbsZ5huB88gjafQEfthEN7e291ipdsT6QNso5tDHMV", "492": "QmSTPagUBQakXnhCvv6Trbivurt9Ebtw2WRsy8pWQe2SKz", "493": "QmVwUihrELm29qYT4sGzbcCCACu3gS7vk5awtgXKs3MCAw", "494": "QmRW5uqiKcmAhXDWCayTwHV5RsrzSo6ej3wh9SxA2mVqrj", "495": "QmTY66RcCqyw8uQA4x76wpx1KTQqQZFBGcQ5vWxfbsgt1U", "496": "QmWvQ2is4kybEa28yBo6i1KLZcxvv5Md9nDF7kxDsyZEPM", "497": "QmPZ4AE7NRnymatYxkrAieN2zNwtTWmi5BEiN49MJJYU2e", "498": "QmZ4T5W7BnUdSNBzFy7LdEdowacVMM2J58NuHA5ZkCi6Sy", "499": "QmdzBX4XQp9R1xKLLCxV33W2ntep3pyddoqoSCRJtiwdfy"};

const PALETTES = [
  { name: 'Inferno', accent: '#ff4400' },
  { name: 'Void', accent: '#8800ff' },
  { name: 'Emerald', accent: '#00ff88' },
  { name: 'Neon Rose', accent: '#ff0088' },
  { name: 'Deep Blue', accent: '#0088ff' },
  { name: 'Solar', accent: '#ffaa00' },
  { name: 'Frost', accent: '#00ffff' },
  { name: 'Plasma', accent: '#ff00ff' },
  { name: 'Toxic', accent: '#00ffaa' },
  { name: 'Magma', accent: '#ff6644' },
  { name: 'Ultraviolet', accent: '#aa00ff' },
  { name: 'Acid', accent: '#44ff00' },
  { name: 'Amber', accent: '#ff8800' },
  { name: 'Ocean', accent: '#4488ff' },
  { name: 'Blood Fire', accent: '#ff2222' },
  { name: 'Gold Dust', accent: '#cccc00' },
  { name: 'Sakura', accent: '#ff44aa' },
  { name: 'Matrix', accent: '#00ff44' },
  { name: 'Midnight', accent: '#4444ff' },
  { name: 'Crown', accent: '#ffdd00' },
  { name: 'Lime Lightning', accent: '#88ff00' },
  { name: 'Crimson Pulse', accent: '#ff4488' },
  { name: 'Arctic', accent: '#00aaff' },
  { name: 'Nebula', accent: '#aa44ff' },
  { name: 'Red Shift', accent: '#ff0066' },
  { name: 'Aurora', accent: '#00ffcc' },
  { name: 'Phoenix Gold', accent: '#ffcc00' },
  { name: 'Cosmic', accent: '#6644ff' },
  { name: 'Dawn', accent: '#ff8844' },
  { name: 'Teal Storm', accent: '#44ffcc' },
];


function BurnProgress() {
  const burnStats = useBurnStats();
  const xnt = burnStats.loaded ? burnStats.xntCollected.toFixed(2) : '...';
  const burned = burnStats.loaded ? burnStats.riseBurned.toLocaleString() : '...';
  const pct = burnStats.loaded ? burnStats.burnPct : '...';
  return (
    <>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="burn-stat">
          <div className="burn-stat-value" style={{ color: '#ff6b35' }}>{xnt} XNT</div>
          <div className="burn-stat-label">Collected from Mints</div>
        </div>
        <div className="burn-stat">
          <div className="burn-stat-value" style={{ color: '#ff2222' }}>{burned} RISE</div>
          <div className="burn-stat-label">Burned Forever</div>
        </div>
        <div className="burn-stat">
          <div className="burn-stat-value" style={{ color: '#ffdd00' }}>{pct}%</div>
          <div className="burn-stat-label">of Total Supply Burned</div>
        </div>
      </div>
      <div style={{marginBottom: '0.5rem'}}>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:'.8rem', color:'#aaa', marginBottom:'0.25rem'}}>
          <span>🔥 RISE Burned</span>
          <span>{pct}% of supply</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: burnStats.loaded ? `${Math.min(parseFloat(pct) / 20 * 100, 100)}%` : '0%', background: '#ff2222' }}>
            {burnStats.loaded ? `${burned} RISE` : 'Loading...'}
          </div>
        </div>
      </div>
      <div style={{marginTop: '0.75rem'}}>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:'.8rem', color:'#aaa', marginBottom:'0.25rem'}}>
          <span>💰 XNT Collected from Mints</span>
          <span>{burnStats.loaded ? `${xnt} / 5,000 XNT` : '...'}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: burnStats.loaded ? `${Math.min((burnStats.xntCollected / 5000) * 100, 100)}%` : '0%', background: '#ff6b35' }}>
            {burnStats.loaded ? `${xnt} XNT` : 'Loading...'}
          </div>
        </div>
      </div>
      <p className="burn-status">🔥 {burned} RISE burned · {xnt} XNT collected for buyback</p>
    </>
  );
}

function useMintStats() {
  const { connection } = useConnection();
  const [stats, setStats] = useState({ total: 0, ember: 0, blaze: 0, genesis: 0, loaded: false });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const acc = await connection.getAccountInfo(MINT_STATE_PDA);
        if (!acc || acc.data.length < 12) return;
        const total = acc.data[8] | (acc.data[9] << 8) | (acc.data[10] << 16) | (acc.data[11] << 24);
        // Count actual minted tiers from bitmap (offset 45-108, 64 bytes)
        const bitmapRaw = acc.data.slice(45, 109);
        let ember = 0, blaze = 0, genesis = 0;
        for (let i = 0; i < 500; i++) {
          const u64Idx = Math.floor(i / 64);
          const bitIdx = i % 64;
          const lo = bitmapRaw.readUInt32LE(u64Idx * 8);
          const hi = bitmapRaw.readUInt32LE(u64Idx * 8 + 4);
          const isMinted = bitIdx < 32 ? (lo & (1 << bitIdx)) !== 0 : (hi & (1 << (bitIdx - 32))) !== 0;
          if (isMinted) {
            if (i < 400) ember++;
            else if (i < 475) blaze++;
            else genesis++;
          }
        }
        if (!cancelled) setStats({ total, ember, blaze, genesis, loaded: true });
      } catch(e) {}
    })();
    return () => { cancelled = true; };
  }, [connection]);
  return stats;
}

function useBurnStats() {
  const [burnStats, setBurnStats] = useState({ xntCollected: 0, riseBurned: 0, burnPct: 0, loaded: false });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/burn-stats');
        const data = await res.json();
        if (!cancelled) setBurnStats({
          xntCollected: data.xntCollected || 0,
          riseBurned: data.riseBurned || 0,
          burnPct: data.burnPct || '0.00',
          loaded: true
        });
      } catch(e) {
        console.error("Burn stats error:", e);
        if (!cancelled) setBurnStats({ xntCollected: 0, riseBurned: 0, burnPct: '0.00', loaded: true });
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return burnStats;
}


function MintReveal({ mintNumber, onClose, onViewGallery }) {
  if (mintNumber === null) return null;
  const palette = PALETTES[NFT_PALETTE_MAP[mintNumber] ?? mintNumber % PALETTES.length];
  const IPFS_GATEWAYS = [
    'https://w3s.link/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://nftstorage.link/ipfs',
    'https://gateway.lighthouse.storage/ipfs',
  ];
  const ipfsUrl = (cid) => `${IPFS_GATEWAYS[0]}/${cid}`;
  const imgUrl = phoenixImg(mintNumber);

  return (
    <div className="reveal-overlay" onClick={onClose}>
      <div className="reveal-modal" onClick={(e) => e.stopPropagation()} style={{ boxShadow: `0 0 80px ${palette.accent}80, 0 0 160px ${palette.accent}33` }}>
        <div className="reveal-badge" style={{ color: palette.accent, borderColor: palette.accent }}>1 OF 1</div>
        <h2 className="reveal-title" style={{ color: palette.accent }}>RISE Phoenix #{mintNumber}</h2>
        <img src={imgUrl} alt={`Phoenix #${mintNumber}`} className="reveal-img" />
        <div className="reveal-tier-info" style={{ color: palette.accent }}>
          <span className="reveal-tier-name">{palette.name}</span> · <span>Unique 1-of-1</span>
        </div>
        <p className="reveal-desc" style={{ color: palette.accent }}>Same bird. Different fire. This phoenix is one of 500 — no two alike.</p>
        <button className="reveal-close" onClick={() => { onClose(); onViewGallery && onViewGallery(); }} style={{ background: palette.accent }}>🦅 View in Gallery</button>
      </div>
    </div>
  );
}

function MintButton({ onMintSuccess, onViewGallery }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [step, setStep] = useState('idle'); // idle | requesting | waiting | fulfilling | done
  const [error, setError] = useState(null);
  const [revealNumber, setRevealNumber] = useState(null);
  const [txSig, setTxSig] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const GEIGER_PROGRAM = new PublicKey(CONFIG[NETWORK].geiger);
  const METADATA_PROGRAM_PUBKEY = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  const [oracleStatePDA] = PublicKey.findProgramAddressSync([Buffer.from('oracle_state')], GEIGER_PROGRAM);
  const [entropyPoolPDA] = PublicKey.findProgramAddressSync([Buffer.from('entropy_pool')], GEIGER_PROGRAM);

  

  const mint = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    setError(null);
    setRevealNumber(null);

    try {
      // ── STEP 1: Request Randomness ──
      setStep('requesting');

      const [pendingMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('pending_mint'), wallet.publicKey.toBuffer()],
        RISE_PROGRAM
      );

      // Derive randomness request PDA
      const oracleAcc = await connection.getAccountInfo(oracleStatePDA);
      // Read total_requests — try different offsets
      let totalRequests = 0;
      if (oracleAcc && oracleAcc.data.length >= 16) {
        try {
          totalRequests = Number(oracleAcc.data.readBigUInt64LE(48));
        } catch(e) { totalRequests = 0; }
      }

      const [randomnessRequestPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('rand_request'),
          wallet.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(totalRequests)]).buffer))
        ],
        GEIGER_PROGRAM
      );

      // Check for stuck pending mint and close it first
      const existingPending = await connection.getAccountInfo(pendingMintPDA);
      if (existingPending) {
        const closeDiscriminator = Buffer.from([128, 201, 19, 78, 249, 231, 10, 165]);
        const closeIx = new TransactionInstruction({
          keys: [
            { pubkey: pendingMintPDA, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          ],
          programId: RISE_PROGRAM,
          data: closeDiscriminator,
        });
        const closeTx = new Transaction().add(closeIx);
        const { blockhash: bhClose } = await connection.getLatestBlockhash();
        closeTx.recentBlockhash = bhClose;
        closeTx.feePayer = wallet.publicKey;
        const signedClose = await wallet.signTransaction(closeTx);
        const sigClose = await connection.sendRawTransaction(signedClose.serialize());
        await connection.confirmTransaction(sigClose, 'confirmed');
      }

      // request_mint discriminator
      const requestDiscriminator = Buffer.from([130, 38, 27, 69, 46, 211, 135, 145]);

      const requestIx = new TransactionInstruction({
        keys: [
          { pubkey: MINT_STATE_PDA, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: pendingMintPDA, isSigner: false, isWritable: true },
          { pubkey: oracleStatePDA, isSigner: false, isWritable: true },
          { pubkey: entropyPoolPDA, isSigner: false, isWritable: false },
          { pubkey: randomnessRequestPDA, isSigner: false, isWritable: true },
          { pubkey: GEIGER_PROGRAM, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: RISE_PROGRAM,
        data: requestDiscriminator,
      });

      const tx1 = new Transaction().add(requestIx);
      const { blockhash: bh1 } = await connection.getLatestBlockhash();
      tx1.recentBlockhash = bh1;
      tx1.feePayer = wallet.publicKey;
      const signed1 = await wallet.signTransaction(tx1);
      const sig1 = await connection.sendRawTransaction(signed1.serialize());
      await connection.confirmTransaction(sig1, 'confirmed');

      // ── STEP 2: Poll until randomness is fulfilled ──
      setStep('waiting');
      setCountdown(30);
      const interval = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
      // Poll every 3s until status byte = 1 (fulfilled), max 180s
      await new Promise((resolve) => {
        let elapsed = 0;
        const poll = setInterval(async () => {
          elapsed += 3;
          try {
            const reqAcc = await connection.getAccountInfo(randomnessRequestPDA);
            if (reqAcc && reqAcc.data[104] === 1) {
              clearInterval(poll);
              resolve();
            }
          } catch(e) {}
          if (elapsed >= 180) { clearInterval(poll); resolve(); }
        }, 3000);
      });
      clearInterval(interval);
      
      // Daemon auto-fulfills randomness — no user tx needed
      
      // Read result
      const reqData = await connection.getAccountInfo(randomnessRequestPDA);
      const resultBytes = reqData.data.slice(72, 104);

      // ── STEP 3: Fulfill Mint ──
      setStep('fulfilling');

      const nftMintKeypair = Keypair.generate();
      const nftMint = nftMintKeypair.publicKey;
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), METADATA_PROGRAM_PUBKEY.toBuffer(), nftMint.toBuffer()],
        METADATA_PROGRAM_PUBKEY
      );
      const minterAta = getAssociatedTokenAddressSync(nftMint, wallet.publicKey);

      // fulfill_mint discriminator  
      const fulfillDiscriminator = Buffer.from([57, 64, 56, 56, 44, 114, 224, 165]);

      const fulfillIx = new TransactionInstruction({
        keys: [
          { pubkey: MINT_STATE_PDA, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: pendingMintPDA, isSigner: false, isWritable: true },
          { pubkey: randomnessRequestPDA, isSigner: false, isWritable: false },
          { pubkey: nftMint, isSigner: true, isWritable: true },
          { pubkey: minterAta, isSigner: false, isWritable: true },
          { pubkey: metadataPDA, isSigner: false, isWritable: true },
          { pubkey: RISE_RECEIVER, isSigner: false, isWritable: true },
          { pubkey: new PublicKey("HGFisVbULNKqogtPuGTfcHG9y6i5nboZabYwifkiiodo"), isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: METADATA_PROGRAM_PUBKEY, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
        ],
        programId: RISE_PROGRAM,
        data: fulfillDiscriminator,
      });

      const tx2 = new Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 })).add(fulfillIx);
      const { blockhash: bh2 } = await connection.getLatestBlockhash();
      tx2.recentBlockhash = bh2;
      tx2.feePayer = wallet.publicKey;
      tx2.partialSign(nftMintKeypair);
      const signed2 = await wallet.signTransaction(tx2);
      const sig2 = await connection.sendRawTransaction(signed2.serialize());
      const txDetails = await connection.confirmTransaction(sig2, "confirmed");
      const tx = await connection.getTransaction(sig2, { maxSupportedTransactionVersion: 0 });
      // Parse MintEvent from base64-encoded "Program data" log
      const logs = tx?.meta?.logMessages || [];
      const riseProgIdx = logs.findLastIndex(l => l.includes(CONFIG[NETWORK].program) && l.includes("invoke"));
      const eventLog = logs.slice(riseProgIdx).find(log => log.startsWith("Program data: "));
      let mintNumber = 0;
      if (eventLog) {
        const base64 = eventLog.replace("Program data: ", "");
        const decoded = Buffer.from(base64, 'base64');
        mintNumber = decoded.readUInt32LE(8); // Skip 8-byte discriminator, read u32
      }
      console.log("Event log:", eventLog);
      console.log("Parsed mintNumber:", mintNumber);

      setTxSig(sig2);
      setRevealNumber(mintNumber);
      setStep('done');
      if (onMintSuccess) onMintSuccess();

    } catch (e) {
      setError(e.message?.slice(0, 300) || 'Transaction failed');
      setStep('idle');
    }
  }, [wallet, connection]);

  if (!wallet.connected) return null;

  const buttonLabel = {
    idle: `🔥 Mint — ${MINT_PRICE} XNT`,
    requesting: '☢️ Requesting Randomness...',
    waiting: `⏳ Geiger Generating... ${countdown}s`,
    fulfilling: '🔥 Minting Your Phoenix...',
    done: '✅ Minted!',
  }[step];

  return (
    <div className="mint-area">
      <MintReveal mintNumber={revealNumber} onClose={() => { setRevealNumber(null); setStep('idle'); }} onViewGallery={onViewGallery} />
      
      {(step === 'waiting' || step === 'requesting' || step === 'fulfilling') && (
        <div className="geiger-waiting">
          <div className="geiger-pulse">☢️</div>
          <div className="geiger-steps">
            <div className={`geiger-step ${step === 'requesting' ? 'active' : step !== 'idle' ? 'done' : ''}`}>
              <span className="geiger-step-icon">1</span>
              <span>Randomness Requested</span>
            </div>
            <div className="geiger-step-line" />
            <div className={`geiger-step ${step === 'waiting' ? 'active' : step === 'fulfilling' || step === 'done' ? 'done' : ''}`}>
              <span className="geiger-step-icon">2</span>
              <span>☢️ Geiger Decay Event</span>
            </div>
            <div className="geiger-step-line" />
            <div className={`geiger-step ${step === 'fulfilling' ? 'active' : step === 'done' ? 'done' : ''}`}>
              <span className="geiger-step-icon">3</span>
              <span>Quantum Reveal</span>
            </div>
          </div>
          {step === 'waiting' && (
            <>
              <p style={{color:'var(--text2)', fontSize:'.9rem', margin:'.75rem 0 .25rem'}}>
                Waiting for radioactive decay event on-chain...
              </p>
              <p className="geiger-countdown">{countdown}s</p>
              <div className="geiger-bar"><div className="geiger-bar-fill" style={{width: `${((30-countdown)/30)*100}%`}}/></div>
              <p style={{color:'var(--text2)', fontSize:'.75rem', marginTop:'.5rem', opacity:.6}}>
                Your NFT number is being determined by physical quantum randomness — verifiable on-chain
              </p>
            </>
          )}
          {step === 'fulfilling' && (
            <p style={{color:'var(--accent)', fontWeight:700, marginTop:'1rem'}}>🔥 Minting your phoenix...</p>
          )}
        </div>
      )}

      <button className="mint-btn" onClick={mint} disabled={step !== 'idle' && step !== 'done'}>
        {buttonLabel}
      </button>

      {txSig && step === 'done' && (
        <p className="mint-success">
          ✅ Minted! Tx:{' '}
          <a href={`${NETWORK === 'mainnet' ? 'https://explorer.x1.xyz' : 'https://explorer.testnet.x1.xyz'}/tx/${txSig}`} target="_blank" rel="noopener noreferrer">
            {txSig.slice(0, 12)}...
          </a>
        </p>
      )}
      {error && <p className="mint-error">❌ {error}</p>}
    </div>
  );
}

function DisclaimerModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>⚠️ Disclaimer</h2>
        <div className="modal-body">
          <p><strong>Last updated: April 25, 2026</strong></p>
          <p>By accessing this website and participating in the RISE Phoenix NFT mint, you acknowledge and agree to the following:</p>
          <ol>
            <li><strong>No Financial Advice.</strong> Nothing on this website constitutes financial, investment, legal, or tax advice.</li>
            <li><strong>High Risk.</strong> Cryptocurrency and NFTs are highly volatile and speculative. You may lose all funds spent.</li>
            <li><strong>No Guarantees.</strong> The project makes no guarantees regarding token value, liquidity, returns, or market performance.</li>
            <li><strong>Not a Security.</strong> RISE Phoenix NFTs are not securities, investment contracts, or financial instruments. They are digital collectibles.</li>
            <li><strong>1-of-1 Mint.</strong> Each phoenix is unique — different color palette and background. Your specific phoenix is determined by on-chain randomness from the Geiger Entropy Oracle. Results are unpredictable and final.</li>
            <li><strong>Regulatory Risk.</strong> Regulations vary by jurisdiction. Ensure compliance with local laws before participating.</li>
            <li><strong>Smart Contract Risk.</strong> Smart contracts may contain bugs or vulnerabilities. Participation is at your own risk.</li>
            <li><strong>No Refunds.</strong> All mints are final. No refunds once a transaction is confirmed on-chain.</li>
            <li><strong>Independent Project.</strong> RISE Phoenix is not endorsed by, affiliated with, or sponsored by the X1 Network Foundation, Degen Launchpad, or any exchange.</li>
            <li><strong>Age Requirement.</strong> You must be at least 18 years old to participate.</li>
            <li><strong>Limitation of Liability.</strong> The creators disclaim all liability for any damages arising from your participation.</li>
          </ol>
          <p>By clicking "I Agree," you confirm that you have read, understood, and accept all terms above.</p>
        </div>
        <div className="modal-actions">
          <button className="modal-btn agree" onClick={onClose}>I Agree</button>
        </div>
      </div>
    </div>
  );
}

function ColorShowcase() {
  return (
    <div className="color-grid">
      {PALETTES.map((v, i) => (
        <div
          key={i}
          className="color-swatch"
          style={{ background: '#0a0a1a', boxShadow: `0 0 20px ${v.accent}, inset 0 0 30px ${v.accent}33` }}
        >
          <div className="swatch-accent" style={{ background: v.accent }} />
          <span className="swatch-name" style={{ color: v.accent }}>{v.name}</span>
        </div>
      ))}
    </div>
  );
}

function NFTGallery() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [nfts, setNfts] = useState([]);
  const [loadingNfts, setLoadingNfts] = useState(false);

  useEffect(() => {
    if (!wallet.publicKey) { setNfts([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingNfts(true);
      try {
        // Get all token accounts for this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { programId: TOKEN_PROGRAM_ID });
        const phoenixNfts = [];
        for (const ta of tokenAccounts.value) {
          const info = ta.account.data.parsed.info;
          // Only look at NFTs (amount = 1, decimals = 0)
          if (info.tokenAmount?.amount !== '1' || info.tokenAmount?.decimals !== 0) continue;
          const mint = new PublicKey(info.mint);
          try {
            // Fetch Metaplex metadata
            const [metadataPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
              TOKEN_METADATA_PROGRAM_ID
            );
            const metaAccount = await connection.getAccountInfo(metadataPDA);
            if (!metaAccount) continue;
            // Parse metadata — skip first 8 bytes (discriminator) + 4 bytes (key length) + key
            const data = metaAccount.data;
            let offset = 65; // skip to name field (after key)
            const nameLen = data.readUInt32LE(offset); offset += 4;
            const nameBytes = data.slice(offset, offset + nameLen);
            const name = String.fromCharCode(...nameBytes).split('\0')[0]; offset += nameLen;
            const symbolLen = data.readUInt32LE(offset); offset += 4;
            const symbol = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0+$/, ''); offset += symbolLen;
            const uriLen = data.readUInt32LE(offset); offset += 4;
            const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0+$/, '');
            if (symbol === 'RISE' || name.startsWith('RISE Phoenix')) {
              // Extract number from name for palette
              const numMatch = name.match(/#(\d+)/);
              const numId = numMatch ? parseInt(numMatch[1]) : 0;
              const numIdx = numId - 1;
              const tierName = numIdx < 400 ? "Ember" : numIdx < 475 ? "Blaze" : "Genesis";
              const palette = PALETTES[NFT_PALETTE_MAP[numIdx] ?? numIdx % PALETTES.length];
              // Try to fetch JSON metadata for image
              let image = phoenixImg(numIdx);
              try {
                const res = await fetch(uri);
                const json = await res.json();
                if (json.image) image = json.image;
              } catch (e) { /* use defaults */ }
              phoenixNfts.push({
                mint: mint.toBase58(),
                name,
                symbol,
                uri,
                image,
                palette,
                tierName,
              });
            }
          } catch (e) { continue; }
        }
        if (!cancelled) setNfts(phoenixNfts);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoadingNfts(false); }
    })();
    return () => { cancelled = true; };
  }, [wallet.publicKey, connection]);

  if (!wallet.connected) return null;
  if (loadingNfts) return (
    <div className="gallery-section">
      <h2>🦅 Your Phoenixes</h2>
      <p style={{ color: '#8888aa', textAlign: 'center' }}>Loading your NFTs...</p>
    </div>
  );
  if (nfts.length === 0) return null;

  return (
    <div className="gallery-section" id="gallery">
      <h2>🦅 Your Phoenixes</h2>
      <p className="section-sub">{nfts.length} phoenix{nfts.length > 1 ? 'es' : ''} in your wallet</p>
      <div className="gallery-grid">
        {nfts.map((nft) => (
          <div key={nft.mint} className="gallery-card" style={{ boxShadow: `0 0 25px ${nft.palette.accent}4D` }}>
            
            <img src={nft.image} alt={nft.name} className="gallery-img" />
            <div className="gallery-info">
              <h3 style={{ color: nft.palette.accent }}>{nft.name}</h3>
              <p className="gallery-tier" style={{ color: nft.palette.accent }}>{nft.tierName} Tier</p>
              <a href={`${NETWORK === 'mainnet' ? 'https://explorer.x1.xyz' : 'https://explorer.testnet.x1.xyz'}/address/${nft.mint}`} target="_blank" rel="noopener noreferrer" className="gallery-link">
                View on Explorer ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function phoenixImg(id) {
  const cid = IMAGE_CIDS[String(id)];
  return cid ? `https://gateway.lighthouse.storage/ipfs/${cid}` : `/nft/${id}.jpg`;
}

function AllGallery() {
  const { connection } = useConnection();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mintStateAccount = await connection.getAccountInfo(MINT_STATE_PDA);
        if (!mintStateAccount || mintStateAccount.data.length < 12) {
          setLoading(false);
          return;
        }
        const dv = new DataView(mintStateAccount.data.buffer || mintStateAccount.data);
        const totalMinted = dv.getUint32(8, true);
        if (totalMinted === 0) { if (!cancelled) { setLoading(false); setNfts([]); } return; }

        // Read bitmap to find actually minted NFT IDs
        const bitmapData = mintStateAccount.data.slice(45, 109);
        const items = [];
        for (let i = 0; i < 500; i++) {
          const u64Idx = Math.floor(i / 64);
          const bitIdx = i % 64;
          const lo = bitmapData.readUInt32LE(u64Idx * 8);
          const hi = bitmapData.readUInt32LE(u64Idx * 8 + 4);
          const isMinted = bitIdx < 32 ? (lo & (1 << bitIdx)) !== 0 : (hi & (1 << (bitIdx - 32))) !== 0;
          if (isMinted) {
            const palette = PALETTES[NFT_PALETTE_MAP[i] ?? i % PALETTES.length];
            const tierName = i < 400 ? "Ember" : i < 475 ? "Blaze" : "Genesis";
            items.push({
              id: i,
              number: i + 1,
              palette,
              tierName,
              image: phoenixImg(i),
            });
          }
        }
        if (!cancelled) setNfts(items);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [connection]);

  if (loading) return (
    <div className="gallery-page">
      <h2>🦅 Phoenix Gallery</h2>
      <p style={{ color: '#8888aa', textAlign: 'center' }}>Loading all minted phoenixes...</p>
    </div>
  );
  if (error) return (
    <div className="gallery-page">
      <h2>🦅 Phoenix Gallery</h2>
      <p style={{ color: '#ff6b35', textAlign: 'center' }}>Error: {error}</p>
    </div>
  );
  if (nfts.length === 0) return (
    <div className="gallery-page">
      <h2>🦅 Phoenix Gallery</h2>
      <p style={{ color: '#8888aa', textAlign: 'center' }}>No phoenixes minted yet. Be the first!</p>
    </div>
  );

  return (
    <div className="gallery-page">
      <h2>🦅 Phoenix Gallery</h2>
      <p className="section-sub">All {nfts.length} minted phoenix{nfts.length !== 1 ? 'es' : ''} — every one is a 1-of-1</p>
      <div className="gallery-grid all-gallery-grid">
        {nfts.map((nft) => (
          <div key={nft.id} className="gallery-card" style={{ boxShadow: `0 0 25px ${nft.palette.accent}4D` }}>
            
            <img src={nft.image} alt={`Phoenix #${nft.number}`} className="gallery-img" />
            <div className="gallery-info">
              <h3 style={{ color: nft.palette.accent }}>RISE Phoenix #{nft.number}</h3>
              <p className="gallery-tier" style={{ color: nft.palette.accent }}>{nft.tierName} Tier</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function MintStats() {
  const stats = useMintStats();
  const remaining = 500 - stats.total;
  const emberLeft = 400 - stats.ember;
  const blazeLeft = 75 - stats.blaze;
  const genesisLeft = 25 - stats.genesis;
  return (
    <div className="mint-stats-block">
      <div className="mint-specs">
        <div className="mint-spec"><span className="mint-spec-label">Collection</span><span className="mint-spec-value">Series 1</span></div>
        <div className="mint-spec"><span className="mint-spec-label">Minted</span><span className="mint-spec-value" style={{color:'var(--accent)'}}>{stats.loaded ? `${stats.total} / 500` : '...'}</span></div>
        <div className="mint-spec"><span className="mint-spec-label">Price</span><span className="mint-spec-value">10 XNT</span></div>
        <div className="mint-spec"><span className="mint-spec-label">Remaining</span><span className="mint-spec-value" style={{color:'#22c55e'}}>{stats.loaded ? remaining : '...'}</span></div>
      </div>
      {stats.loaded && (
        <div className="tier-progress">
          <div className="tier-prog-row">
            <span style={{color:'#ff6b35'}}>🔥 Ember</span>
            <div className="tier-prog-bar"><div className="tier-prog-fill" style={{width:`${(stats.ember/400)*100}%`, background:'#ff6b35'}}/></div>
            <span style={{color:'#ff6b35'}}>{emberLeft} left</span>
          </div>
          <div className="tier-prog-row">
            <span style={{color:'#8800ff'}}>⚡ Blaze</span>
            <div className="tier-prog-bar"><div className="tier-prog-fill" style={{width:`${(stats.blaze/75)*100}%`, background:'#8800ff'}}/></div>
            <span style={{color:'#8800ff'}}>{blazeLeft} left</span>
          </div>
          <div className="tier-prog-row">
            <span style={{color:'#ffdd00'}}>✨ Genesis</span>
            <div className="tier-prog-bar"><div className="tier-prog-fill" style={{width:`${(stats.genesis/25)*100}%`, background:'#ffdd00'}}/></div>
            <span style={{color:'#ffdd00'}}>{genesisLeft} left</span>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [imageCids, setImageCids] = useState({});
  useEffect(() => {
    fetch('/image-cids.json').then(r=>r.json()).then(d => { window.__imageCids__ = d; setImageCids(d); });
  }, []);
  const [agreed, setAgreed] = useState(false);
  const [page, setPage] = useState('mint');

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const handleAgree = () => {
    setAgreed(true);
    setShowDisclaimer(false);
  };

  return (
    <ConnectionProvider endpoint={RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app">
            <nav className="top-nav">
              <div className="nav-brand">🔥 RISE Phoenix</div>
              <div className="nav-links">
                <button className={`nav-btn ${page === 'mint' ? 'active' : ''}`} onClick={() => setPage('mint')}>Mint</button>
                <button className={`nav-btn ${page === 'gallery' ? 'active' : ''}`} onClick={() => setPage('gallery')}>Gallery</button>
              </div>
              <div className="nav-wallet"><WalletMultiButton /></div>
            </nav>
            {page === 'gallery' && <AllGallery />}
            {page === 'mint' && <>
            {/* Hero */}
            <section className="hero">
              <div className="particles">{Array.from({ length: 20 }).map((_, i) => <span key={i} className="particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 6}s`, animationDuration: `${4 + Math.random() * 4}s` }} />)}</div>
              <div className="hero-content">
                <span className="hero-badge">X1 Network · Series 1 of 3 · Powered by Geiger Entropy Oracle ☢️</span>
                <h1>RISE Phoenix</h1>
                <p>500 unique 1-of-1 phoenixes. Same bird, different fire, different color, different cosmos. Mint for 10 XNT. Every single one is one-of-a-kind.</p>
                <div className="stats">
                  <div className="stat"><div className="stat-num">500</div><div className="stat-label">Total NFTs</div></div>
                  <div className="stat"><div className="stat-num">10</div><div className="stat-label">XNT Per Mint</div></div>
                  <div className="stat"><div className="stat-num">☢️</div><div className="stat-label">Geiger Random</div></div>
                  <div className="stat"><div className="stat-num">100%</div><div className="stat-label">☢️ Geiger Powered</div></div>
                </div>
                <a href="#mint" className="cta">Mint Your Phoenix ↓</a>
              </div>
            </section>

            {/* Tier Showcase — Ember / Blaze / Genesis */}
            <section className="tier-showcase" id="tiers">
              <h2>Three Tiers. Three Phoenixes. One Legend.</h2>
              <p className="section-sub">Every phoenix is a 1-of-1 — but some burn brighter than others.</p>
              <div className="tier-cards">
                <div className="tier-card tier-ember">
                  
                  <img src="/ember-base.jpg" alt="Ember Phoenix" className="tier-card-img" />
                  <div className="tier-card-info">
                    <h3 style={{ color: '#ff6b35' }}>EMBER</h3>
                    <p className="tier-card-desc">400 unique Fire Phoenixes. Each one burns a different color — from inferno red to acid green to deep violet. No two are alike.</p>
                    <div className="tier-card-stats">
                      <span>🔥 Rare Tier</span>
                      <span>10 XNT</span>
                    </div>
                  </div>
                </div>
                <div className="tier-card tier-blaze">
                  
                  <img src="/blaze-base.jpg" alt="Blaze Phoenix" className="tier-card-img" />
                  <div className="tier-card-info">
                    <h3 style={{ color: '#8800ff' }}>BLAZE</h3>
                    <p className="tier-card-desc">75 rare Storm Phoenixes cracking with electric energy. Blue lightning, steel frame, pure power.</p>
                    <div className="tier-card-stats">
                      <span>⚡ Epic Tier</span>
                      <span>10 XNT</span>
                    </div>
                  </div>
                </div>
                <div className="tier-card tier-genesis">
                  
                  <img src="/genesis-base.jpg" alt="Genesis Phoenix" className="tier-card-img" />
                  <div className="tier-card-info">
                    <h3 style={{ color: '#ffdd00' }}>GENESIS</h3>
                    <p className="tier-card-desc">Only 25 ever minted. Golden cosmic phoenix with holographic frame — the most sought after in the collection.</p>
                    <div className="tier-card-stats">
                      <span>✨ Legendary Tier</span>
                      <span>10 XNT</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="entropy-note" style={{ marginTop: '2rem' }}>
                <span className="entropy-icon">☢️</span>
                <div>
                  <strong>Which one will you get?</strong>
                  <p>Mint order is determined by the Geiger Entropy Oracle — quantum randomness you can verify on-chain. You don't choose the fire. The fire chooses you.</p>
                </div>
              </div>
            </section>

            {/* Collection */}




            {/* Tokenomics */}
            <section className="tokenomics" id="tokenomics">
              <h2>$RISE Tokenomics</h2>
              <p className="section-sub">1,000,000,000 total supply · Built to shrink</p>
              <div className="token-grid">
                <div className="token-card">
                  <div className="token-pct">20%</div>
                  <div className="token-label">Burned</div>
                  <div className="token-detail">200M RISE permanently removed. Front-loaded W1–W4. Creates immediate scarcity.</div>
                </div>
                <div className="token-card">
                  <div className="token-pct">2%</div>
                  <div className="token-label">Airdrop</div>
                  <div className="token-detail">20M RISE distributed to early supporters.</div>
                </div>
                <div className="token-card">
                  <div className="token-pct">15%</div>
                  <div className="token-label">Where Your XNT Goes</div>
                  <div className="token-detail">150M RISE reserved for liquidity. 70% of XNT from each mint is paired with RISE to build the LP progressively. 30% buys and burns RISE. Any unpaired RISE rolls over to future mint rounds.</div>
                </div>
                <div className="token-card">
                  <div className="token-pct">3%</div>
                  <div className="token-label">Staking Rewards</div>
                  <div className="token-detail">30M RISE distributed to stakers. Reward long-term holders.</div>
                </div>
                <div className="token-card">
                  <div className="token-pct">60%</div>
                  <div className="token-label">Degen Launch Pad + LP</div>
                  <div className="token-detail">600M RISE for launchpad and liquidity pools.</div>
                </div>
              </div>
              <div className="burn-progress">
                <h3>Burn Progress</h3>
                <BurnProgress />
              </div>
              <div className="nft-engine">
                <h3>NFT Mint Engine</h3>
                <div className="engine-flow">
                  <div className="engine-step">🪙 <br/>You Mint<br/>10 XNT</div>
                  <div className="engine-arrow">→</div>
                  <div className="engine-step">☢️ <br/>Geiger Oracle<br/>Assigns #</div>
                  <div className="engine-arrow">→</div>
                  <div className="engine-split">
                    <div className="engine-step burn">🔥 30%<br/>Buy & Burn</div>
                    <div className="engine-step lp">💧 60%<br/>→ Liquidity + 150M RISE</div>
                    <div className="engine-step" style={{background:'rgba(255,200,0,0.1)', border:'1px solid rgba(255,200,0,0.3)'}}>☢️ 10%<br/>Geiger Oracle</div>
                  </div>
                </div>
                <p className="engine-note">500 NFTs · 9 XNT to treasury + 1 XNT to Geiger Oracle per mint · 30% buys & burns RISE · 70% → LP with 150M RISE</p>
              </div>
            </section>

            {/* Mint Section */}
            <section className="mint-section" id="mint">
              <h2>Mint Your Phoenix — Series 1</h2>
              <p className="section-sub">10 XNT · 500 total · Every phoenix is 1-of-1 · Powered by Geiger Entropy ☢️</p>
              <div className="mint-card">
                <img src={phoenixImg(475)} alt="RISE Phoenix" className="mint-hero-img" />
                <div className="mint-info">
                  <MintStats />
                  <ul className="mint-perks">
                    <li>Every phoenix is a 1-of-1 — 3 tiers, 500 unique color variants, zero duplicates</li>
                    <li>Mint order determined by quantum radioactive decay on-chain — verifiable, not manipulable</li>
                    <li>30% of your XNT buys and burns RISE · 70% goes to LP with RISE</li>
                  </ul>
                  {!agreed ? (
                    <div className="disclaimer-banner">
                      <p>⚠️ You must accept the disclaimer before minting.</p>
                      <button className="disclaimer-btn" onClick={() => setShowDisclaimer(true)}>Read Disclaimer</button>
                    </div>
                  ) : (
                    <MintButton onMintSuccess={() => {}} onViewGallery={() => setPage('gallery')} />
                  )}
                </div>
              </div>
            </section>

            {/* Buyback */}
            <section className="buyback">
              <h2>Where Your XNT Goes</h2>
              <p>9 XNT from every mint goes to the treasury — 30% buys and burns RISE, 70% adds to liquidity paired with RISE. 1 XNT per mint goes directly to the Geiger Oracle node keeping randomness running. LP tokens are burned. No team allocation.</p>
              <div className="buyback-flow">
                <div className="buyback-step"><div className="buyback-step-icon">🪙</div><div className="buyback-step-text">You Mint<br/>a Phoenix</div></div>
                <div className="buyback-arrow">→</div>
                <div className="buyback-step"><div className="buyback-step-icon">🔥</div><div className="buyback-step-text">30% Buys<br/>& Burns RISE</div></div>
                <div className="buyback-arrow">→</div>
                <div className="buyback-step"><div className="buyback-step-icon">💧</div><div className="buyback-step-text">70% → LP<br/>with RISE</div></div>
                <div className="buyback-arrow">→</div>
                <div className="buyback-step"><div className="buyback-step-icon">☠️</div><div className="buyback-step-text">LP Tokens<br/>Burned</div></div>
              </div>
            </section>

            </>}
            {page === 'mint' && <NFTGallery />}
            <footer>
              <p className="footer-disclaimer">⚠️ RISE Phoenix NFTs are digital collectibles, not securities. Tier determination is random and final. No guarantees of value. By using this site you accept the <a href="#" onClick={(e) => { e.preventDefault(); setShowDisclaimer(true); }}>full disclaimer</a>.</p>
              <p>RISE Phoenix Collection · Series 1 of 3 · X1 Network · DGN 🦅🔥☢️</p>
            </footer>

            <DisclaimerModal open={showDisclaimer} onClose={handleAgree} />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}