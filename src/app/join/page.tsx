import { redirect } from "next/navigation";

// Invite links look like /join?ref=abcd1234. Middleware has already stored the
// referral in a cookie by the time this runs, so just send people to sign-up.
export default function JoinPage() {
  redirect("/register");
}
