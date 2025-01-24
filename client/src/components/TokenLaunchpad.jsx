import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { MINT_SIZE, TOKEN_2022_PROGRAM_ID, createMintToInstruction, createAssociatedTokenAccountInstruction, getMintLen, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, TYPE_SIZE, LENGTH_SIZE, ExtensionType, mintTo, getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync } from "@solana/spl-token"
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import { useState } from "react";
import axios from "axios";

export function TokenLaunchpad() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [coinName , setCoinName] = useState("");
    const [coinSymbol , setCoinSymbol] = useState("");
    const [cointInitialSupply , setCoinInitialSupply] = useState(0);
    const [coinDecimals , setCoinDecimals] = useState(0);
    const [coinDescription , setCoinDescription] = useState("");
    const [coinImage, setCoinImage] = useState();

    async function createToken() {
        const mintKeypair = Keypair.generate();
        const formData = new FormData();
        formData.append("file", coinImage);
        formData.append("name", coinName);
        formData.append("symbol", coinSymbol);
        formData.append("description", coinDescription);
        formData.append("walletKey", wallet.publicKey);
        formData.append("mintKey", mintKeypair.publicKey);

        const name = formData.get("name");
        const symbol = formData.get("symbol");
        const description = formData.get("description");
        const walletKey = formData.get("walletKey");
        const mintKey = formData.get("mintKey");


        if(!name || name.length == 0 || !symbol || symbol.length == 0 || !description || description.length == 0 || 
            !walletKey || walletKey.length == 0 || !mintKey || mintKey.length == 0 || !coinImage
          ) {
            console.log("insufficient data");
            return ;
        }

        const response = await axios.post(import.meta.env.VITE_METADATA_LINK, formData , {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }); 
        let uri ;
        if(!response){
            console.log(response);
            return ;
        } else {
            console.log(response);
            uri = response.data.imageUrl;
        }
        
        const metadata = {
            mint: mintKeypair.publicKey,
            name: coinName,
            symbol: coinSymbol,
            description: coinDescription,
            //uri : "https://cdn.100xdevs.com/metadata.json",
            uri ,
            additionalMetadata: []
        };
        console.log(metadata);
        const mintLen = getMintLen([ExtensionType.MetadataPointer]);
        const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: mintLen,
                lamports,
                programId: TOKEN_2022_PROGRAM_ID,
            }),
            createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
            createInitializeMintInstruction(mintKeypair.publicKey, coinDecimals , wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
            createInitializeInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                mint: mintKeypair.publicKey,
                metadata: mintKeypair.publicKey,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                mintAuthority: wallet.publicKey,
                updateAuthority: wallet.publicKey,
            }),
        );
            
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(mintKeypair);

        await wallet.sendTransaction(transaction, connection);

        console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);
        const associatedToken = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,
            wallet.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
        );

        console.log(associatedToken.toBase58());

        const transaction2 = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                associatedToken,
                wallet.publicKey,
                mintKeypair.publicKey,
                TOKEN_2022_PROGRAM_ID,
            ),
        );

        await wallet.sendTransaction(transaction2, connection);
        
        const transaction3 = new Transaction().add(
            createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey, cointInitialSupply, [], TOKEN_2022_PROGRAM_ID)
        );

        await wallet.sendTransaction(transaction3, connection);

        console.log("Minted!")
    }

    return  <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
    }}>
        <h1>Solana Token Launchpad</h1>
        <input onChange={(e) => setCoinName(e.target.value)} className='inputText' type='text' placeholder='Name'></input> <br />
        <input onChange={(e) => setCoinSymbol(e.target.value)} className='inputText' type='text' placeholder='Symbol'></input> <br />
        <input onChange={(e) => setCoinImage(e.target.files[0])} className='inputText' type='file' placeholder='Image URL'></input> <br />
        <input onChange={(e) => setCoinInitialSupply(e.target.value * LAMPORTS_PER_SOL)} className='inputText' type='text' placeholder='Initial Supply'></input> <br />
        <input onChange={(e) => setCoinDecimals(e.target.value)} className='inputText' type='text' placeholder='Decimals'></input> <br />
        <input onChange={(e) => setCoinDescription(e.target.value)} className='inputText' type='text' placeholder='Description'></input> <br />
        <button onClick={createToken} disabled={wallet.publicKey ? false : true} className='btn'>Create a token</button>
    </div>
}