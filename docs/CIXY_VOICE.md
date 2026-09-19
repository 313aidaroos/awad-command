# Cixy spoken voice

Written voice is locked in branding.ts.
Spoken voice:

1. Create elevenlabs.io account (Starter is enough).
2. Voices → pick one warm adult British-leaning woman. Copy Voice ID.
3. Vercel **awad-command** env:
   - ELEVENLABS_API_KEY
   - CIXY_VOICE_ID
4. Redeploy. HQ unmute + Preview voice.

Same two vars later on Socixis and Wallet. One id. Customers cannot overwrite it.
Device TTS stays as fallback if the key is missing.
