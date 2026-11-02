export const metadata = { title: "Privacy" };

// Template only — have this reviewed by counsel for DPDP Act 2023 compliance before launch.
export default function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Draft — last updated November 2026. CorpConnect (&ldquo;we&rdquo;) runs a private network for employees working in Pune.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Your name, corporate email address, company, designation and Pune work hub.</li>
        <li>Content you create: listings and their photos, job posts, referral requests, community posts, comments and messages.</li>
        <li>Basic security logs (IP address and timestamps of sign-in and verification attempts) for rate limiting and abuse prevention.</li>
      </ul>
      <p>We do <strong>not</strong> collect ID cards, payslips, Aadhaar, PAN or any employment documents. Employment is verified only by a one-time code sent to your corporate email.</p>
      <h2>Who can see what</h2>
      <ul>
        <li>Other verified members see your name, company, designation, work hub and anything you post publicly on CorpConnect.</li>
        <li>Your corporate email is never shown to other members.</li>
        <li>Messages are visible only to the two people in the conversation.</li>
      </ul>
      <h2>Processors</h2>
      <p>Supabase (database, authentication, file storage), Vercel (hosting) and Resend (email delivery) process data on our behalf.</p>
      <h2>Your rights</h2>
      <p>You can access and correct your profile at any time and ask us to delete your account by writing to privacy@corpconnect.in. We respond within 30 days.</p>
    </>
  );
}
