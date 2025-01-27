import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { MINT_SIZE, 
    TOKEN_2022_PROGRAM_ID, 
    createMintToInstruction, 
    createAssociatedTokenAccountInstruction, 
    getMintLen, 
    createInitializeMetadataPointerInstruction, 
    createInitializeMintInstruction, 
    TYPE_SIZE, 
    LENGTH_SIZE,
    ExtensionType, 
    getAssociatedTokenAddressSync, 
    AuthorityType, 
    createSetAuthorityInstruction ,
} from "@solana/spl-token"
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import { useState } from "react";
import axios from "axios";
import { WalletDisconnectButton, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { toast } from "react-toastify";

export function TokenLaunchpad() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [coinName , setCoinName] = useState("");
    const [coinSymbol , setCoinSymbol] = useState("");
    const [coinInitialSupply , setCoinInitialSupply] = useState();
    const [coinDecimals , setCoinDecimals] = useState();
    const [coinDescription , setCoinDescription] = useState("");
    const [coinImage, setCoinImage] = useState();
    const [coinImagePreviewURL , setPreviewURL] = useState();
    const [revokeMintAuthority , setRevokeMintAuthority] = useState(false);
    const [creatingToken ,setCreatingToken] = useState(false);


    const handleSetValuesToDefault = () => {
        setCoinName("")
        setCoinSymbol("")
        setCoinInitialSupply("")
        setCoinDecimals("")
        setCoinDescription("")
        setCoinImage("")
        setPreviewURL("")
        setRevokeMintAuthority(false);
        setCreatingToken(false);
    }

    async function createToken() {
        try {
            setCreatingToken(true);
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
                toast.error("Insufficient data");
                return ;
            }
            
            toast.success("Uploading Metadata");
            let uri ;
            const response = await axios.post("https://justtoken-metadata.vercel.app/api/v1/upload/metadata", formData , {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            ); 
            if(!response){
                console.log(response);
                return ;
            } else {
                console.log(response);
                uri = response.data.data;
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

            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

            let lamports;
            lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

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

            const associatedToken = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            );

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
                createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey, coinInitialSupply * Math.pow(10, coinDecimals), [], TOKEN_2022_PROGRAM_ID)
            );

            await wallet.sendTransaction(transaction3, connection);

            console.log("Minted!");

            if(revokeMintAuthority) {

                const transaction4 = new Transaction().add(
                    createSetAuthorityInstruction(
                        mintKeypair.publicKey,  // Mint public key
                        wallet.publicKey,       // Current authority
                        AuthorityType.MintTokens,     // Mint authority type
                        null,    
                        [],
                        TOKEN_2022_PROGRAM_ID              
                    ),
                    SystemProgram.transfer({
                        fromPubkey: wallet.publicKey,
                        toPubkey: new PublicKey("DqYXPfKoHisYM4SM72Y6Dae3zaQqXafdW6dj7FfgcxRN"),
                        lamports: 0.01 * LAMPORTS_PER_SOL,
                    })
                );
                transaction4.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                await wallet.sendTransaction(transaction4, connection);
                toast.success("Token Minted Successfully");
                toast.success("Check your wallet");
                setCreatingToken(false);
                handleSetValuesToDefault();
            }
        } catch (err) {
            console.log(err);
            toast.error(err.message);
            setCreatingToken(false);
        }
    }

    const walletButtonStyle = {
        width: window.innerWidth < 600 ? "10rem" : "24rem",
        borderRadius: "0.75rem",
        color: "#C7F284",
        backgroundColor: "#2D3D3D",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem",
        fontSize: "1.2rem",
        transition: "all 0.5s ease", 
    };
    

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviewURL(reader.result); 
          };
          reader.readAsDataURL(file);
          setCoinImage(file); // Store the file for later use
        }
    };

    return (
        <section className="sm:w-[40rem] w-[80vw] duration-200 flex justify-center p-2 items-start flex-col">
            <h1 className="flex justify-center p-2 items-center w-full text-[#C7F284] text-4xl">
                JUST TOKEN
            </h1>
            <div className="m-2 flex sm:flex-row flex-col w-full sm:justify-between sm:items-center">
                <div>
                    <label className="block mb-2 text-2xl font-medium text-white " htmlFor="name_input">Name</label>
                    <input value={coinName} onChange={(e) => setCoinName(e.target.value)} className='inputText text-xl outline-none focus-within:border-b-2 focus-within:border-[#C7F284] duration-300 focus-within:border-b-2 focus-within:border-[#C7F284] duration-300' id="name_input" type='text' placeholder='Name'></input>
                </div>
                <div>
                    <label className="block mb-2 text-2xl font-medium text-white" htmlFor="symbol_input">Symbol</label>
                    <input value={coinSymbol} onChange={(e) => setCoinSymbol(e.target.value)} className='inputText outline-none focus-within:border-b-2 focus-within:border-[#C7F284] duration-300 focus-within:border-b-2 focus-within:border-[#C7F284] duration-300 text-xl' id="symbol_input" type='text' placeholder='Symbol'></input>
                </div>
            </div>
            
            { 
                coinImage && 
                <img 
                    className="h-20 m-2 w-20 rounded-full object-cover"
                    src={coinImagePreviewURL} alt="" 
                /> 
            }
            <div className="m-2">
                <label className="block mb-2 text-2xl font-medium text-white" htmlFor="file_input">Upload file</label>
                <input onChange={(e) => handleImageChange(e)} className="block w-full text-2xl h-12 flex border border-gray-300 rounded-lg cursor-pointer text-gray-400 focus:outline-none border-gray-600 placeholder-gray-400" id="file_input" type="file"/>
            </div>
            <div className="m-2 flex sm:flex-row flex-col w-full sm:justify-between sm:items-center">
                <div className="">
                    <label className="block mb-2 text-2xl font-medium text-white" htmlFor="decimals_input">Decimals</label>
                    <input value={coinDecimals} onChange={(e) => setCoinDecimals(e.target.value)} className='inputText text-xl outline-none focus-within:border-b-2 focus-within:border-[#C7F284] duration-300' id="decimals_input" type='number' placeholder='Decimals'></input>
                </div>
                <div className="">
                    <label className="block mb-2 text-2xl font-medium text-white" htmlFor="innitial_supply">Initial Supply</label>
                    <input value={coinInitialSupply} onChange={(e) => setCoinInitialSupply(e.target.value) } className='inputText text-xl outline-none focus-within:border-b-2 focus-within:border-[#C7F284] duration-300' type='number' id="initial_supply" placeholder='Initial Supply'></input> 
                </div>
            </div>
            <div className="m-2 w-full ">
                <label className="block mb-2 text-2xl font-medium text-white" htmlFor="text_area">Description</label>
                <textarea value={coinDescription} onChange={(e) => setCoinDescription(e.target.value)}  id="textarea" rows="3" className="block w-full text-xl no-scrollbar rounded-lg outline-none focus-within:border-b-2 focus-within:border-[#C7F284] duration-300 border-gray-600 placeholder-gray-400 text-white" placeholder="Write your coin description here..."></textarea>
            </div>
            <div className="m-2 flex flex-col">
                <div className="text-2xl">
                    Revoke Mint Authority
                </div>
                <div className="flex flex-wrap text-sm text-gray-400 m-1 ml-0">
                    Mint authority allows you to increase token supply
                </div>
                
                <label className="inline-flex items-center cursor-pointer">
                    <input checked={revokeMintAuthority} type="checkbox" value="" onChange={(e) => setRevokeMintAuthority(e.target.checked)} className="sr-only peer" />
                    <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300"> (0.01 SOL) </span>
                </label>
            </div>

            <div className="m-2 flex w-full justify-between gap-2 items-center">
                <button disabled={wallet.publicKey && !creatingToken ? false : true} className="text-2xl hover:text-[#e2f8c1] hover:shadow-[0.2px_0.2px_8px_#e2f8c1] cursor-pointer hover:border-[#C7F284] hover:border duration-200 border-2 w-[24rem]  rounded-lg p-1" onClick={createToken} >Create</button>
                {
                  !wallet.publicKey 
                  ?
                  <WalletMultiButton style={{...walletButtonStyle}}  />
                  :
                  <WalletDisconnectButton style={{...walletButtonStyle}}  />
                }
            </div>
        </section>
    )
}