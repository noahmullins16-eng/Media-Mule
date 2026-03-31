/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Media Mule! Confirm your account to get started.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://fyocavwmovqrctcxbkvs.supabase.co/storage/v1/object/public/email-assets/logo.png"
          alt="Media Mule"
          width="48"
          height="48"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Hi there,</Heading>
        <Text style={text}>
          Welcome to Media Mule! We're excited to have you join our community.
        </Text>
        <Text style={text}>
          Media Mule is designed to make working with media simple and secure. Our
          platform allows creators and clients to safely exchange media files and
          payments through a built-in escrow system, giving both sides confidence
          throughout the process.
        </Text>
        <Text style={text}>
          To get started, please confirm your email address by clicking the link below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Your Account
        </Button>
        <Text style={text}>
          Once your account is confirmed, you'll be able to log in, set up your
          profile, and start exchanging media securely.
        </Text>
        <Text style={text}>
          If you didn't create a Media Mule account, you can safely ignore this email.
        </Text>
        <Text style={text}>
          Thanks for joining us, and welcome to the mule team.
        </Text>
        <Text style={text}>
          Best,
          <br />
          <strong>The Media Mule Team</strong>
        </Text>
        <Text style={footer}>
          <Link href="https://mediamuleco.com" style={footerLink}>MediaMuleco.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '32px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 20%, 10%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 40%)',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: 'hsl(193, 72%, 64%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const footerLink = { color: 'hsl(193, 72%, 64%)', textDecoration: 'none' }
