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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join Media Mule</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://fyocavwmovqrctcxbkvs.supabase.co/storage/v1/object/public/email-assets/logo.png"
          alt="Media Mule"
          width="48"
          height="48"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>Media Mule</strong>
          </Link>
          . Click the button below to accept the invitation and create your account.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={text}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
        <Text style={footer}>
          <Link href="https://mediamuleco.com" style={footerLink}>MediaMuleco.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
const link = { color: 'hsl(25, 95%, 53%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(25, 95%, 53%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const footerLink = { color: 'hsl(25, 95%, 53%)', textDecoration: 'none' }
