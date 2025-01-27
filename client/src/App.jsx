import './App.css'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import Page from './components/Page';
import Footer from './components/Footer';
import JustSwapTemplate from './components/JustSwapTemplate';
import { ToastContainer } from 'react-toastify';

function App() {
  const arr = ["https://dailyhodl.com/wp-content/uploads/2022/01/solana-remains-favorite.jpg",
    "https://dailyhodl.com/wp-content/uploads/2022/01/traders-favor-ethereum-solana.jpg",
    "https://dailyhodl.com/wp-content/uploads/2023/01/sol-Defies-Doubters-Explodes.jpg",
    "/SolanaBG.jpg"
  ];

  return (
    <div 
      style={{
        backgroundImage: `url(${arr[1]})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }} 
      className=' w-screen text-white flex flex-col justify-center items-center'
    >
      <ConnectionProvider endpoint={"https://api.devnet.solana.com"}>
        <WalletProvider wallets={[]} autoConnect>
            <WalletModalProvider>
              <ToastContainer
                position='bottom-right' autoClose={5000} hideProgressBar={false}
                newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable 
                pauseOnHover theme='dark'
              />
              <Page/>
              <JustSwapTemplate/>
              <Footer/>
            </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  )
}

export default App
