import React from 'react'
import Head from 'next/head'
import { siteUrl } from '../config'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = "Mantis",
  description = "Mantis"
}) => {
  const imageUrl = `${siteUrl}/logo.png`

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        <meta property="og:type" content="website"/>
        <meta property="og:title" content={title}/>
        <meta property="og:description" content={description}/>
        <meta property="og:url" content={siteUrl}/>
        <meta property="og:image" content={imageUrl}/>
        <meta property="og:image:width" content="200"/>
        <meta property="og:image:height" content="200"/>
        <meta property="og:image:alt" content="Mantis"/>
        
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content={title}/>
        <meta name="twitter:description" content={description}/>
        <meta name="twitter:image" content={imageUrl}/>
      </Head>

      <Sidebar>
        {children}
      </Sidebar>
    </>
  )
}

export default Layout
