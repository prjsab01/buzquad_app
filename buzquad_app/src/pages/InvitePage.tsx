import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../lib/firestore';

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const [target, setTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    // code is the community/group ID itself (invite link = /invite/<communityId>)
    getDocs(query(collection(firestore, 'communities'), where('__name__', '==', code)))
      .then((snap) => {
        setTarget(snap.empty ? null : `/communities/${code}`);
        setLoading(false);
      });
  }, [code]);

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>Resolving invite…</div>;
  if (target) return <Navigate to={target} replace />;
  return (
    <section className="mx-auto max-w-lg p-8 text-center" style={{ color: 'var(--text-3)' }}>
      <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Invite not found</p>
      <p className="mt-2 text-sm">This invite link may have expired or been revoked.</p>
    </section>
  );
}
