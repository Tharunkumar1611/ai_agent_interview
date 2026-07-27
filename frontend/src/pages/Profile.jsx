import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, selectedRole } = useAuth();

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-violet-200/80">Profile</p>
        <h1 className="section-title mt-2 text-3xl font-bold text-white">Account details</h1>
        <p className="mt-2 text-slate-300">View your authenticated profile information and current role selection.</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {[
          ['Name', user?.name],
          ['Email', user?.email],
          ['Selected Role', selectedRole],
          ['Created At', user?.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown'],
        ].map(([label, value]) => (
          <div key={label} className="glass-panel rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <p className="mt-3 break-words text-2xl font-semibold text-white">{value || 'Not available'}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
