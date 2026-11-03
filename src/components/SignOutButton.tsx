import { signout } from "../../app/auth/actions";

export default function SignOutButton() {
  return (
    <form action={signout} className="inline-block">
      <button
        type="submit"
        className="btn-primary btn-sm"
      >
        Sign out
      </button>
    </form>
  );
}
