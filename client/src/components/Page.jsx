import React from 'react'
import { TokenLaunchpad } from './TokenLaunchpad'

const Page = () => {
    return (
        <section style={{backgroundColor: "rgba(0, 0, 0, 0.4)"}} className="relative my-8 backdrop-blur-sm h-fit w-fit flex justify-center items-center flex-col rounded-lg p-4 shadow-none focus-within:shadow-[0.2px_0.2px_8px_#e2f8c1] focus-within:border-[0.1px] focus-within:border-[#C7F284] transition-shadow duration-300 ">
            <TokenLaunchpad/>
        </section>
    )
}

export default Page