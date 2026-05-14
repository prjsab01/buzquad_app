import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { createPoll, listenToPolls, votePoll } from '../lib/pollService';
import type { Poll, PollType } from '../types/poll';

export default function PollsPage() {
  const { user } = useFirebaseAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<PollType>('single');
  const [optionTexts, setOptionTexts] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState<Record<string, string>>({});

  useEffect(() => {
    return listenToPolls(setPolls);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !question.trim()) return;
    const opts = optionTexts.filter((o) => o.trim());
    if (opts.length < 2) { setError('Add at least 2 options.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await createPoll(
        user.uid,
        user.displayName ?? user.email ?? 'Unknown',
        question.trim(),
        type,
        opts,
      );
      setQuestion('');
      setOptionTexts(['', '']);
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user || voted[pollId]) return;
    await votePoll(pollId, optionId);
    setVoted((prev) => ({ ...prev, [pollId]: optionId }));
  };

  return (
    <section className="mx-auto max-w-5xl p-6">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Polls</h2>
            <p className="mt-1 text-slate-600">Vote on community polls or create your own.</p>
          </div>
          {user && (
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancel' : '+ New Poll'}
            </button>
          )}
        </div>

        {showForm && (
          <form className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleCreate}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Poll question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as PollType)}
            >
              <option value="single">Single choice</option>
              <option value="multiple">Multiple choice</option>
              <option value="yesno">Yes / No</option>
            </select>
            {type !== 'yesno' && (
              <div className="space-y-2">
                {optionTexts.map((opt, i) => (
                  <input
                    key={i}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...optionTexts];
                      next[i] = e.target.value;
                      setOptionTexts(next);
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="text-xs text-slate-500 underline"
                  onClick={() => setOptionTexts((prev) => [...prev, ''])}
                >
                  + Add option
                </button>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Poll'}
            </button>
          </form>
        )}

        {polls.length === 0 ? (
          <p className="text-slate-500">No polls yet. Create one!</p>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => {
              const hasVoted = !!voted[poll.id];
              const options =
                poll.type === 'yesno'
                  ? [{ id: '0', text: 'Yes', voteCount: poll.options?.[0]?.voteCount ?? 0 }, { id: '1', text: 'No', voteCount: poll.options?.[1]?.voteCount ?? 0 }]
                  : poll.options ?? [];
              return (
                <article key={poll.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900">{poll.question}</h3>
                  <p className="text-xs text-slate-400">by {poll.authorDisplayName} · {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</p>
                  <div className="mt-3 space-y-2">
                    {options.map((opt) => {
                      const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
                      return (
                        <button
                          key={opt.id}
                          disabled={hasVoted || !user}
                          onClick={() => handleVote(poll.id, opt.id)}
                          className="relative w-full overflow-hidden rounded-lg border border-slate-200 px-3 py-2 text-left text-sm disabled:cursor-default"
                        >
                          <span
                            className="absolute inset-y-0 left-0 bg-slate-200 transition-all"
                            style={{ width: hasVoted ? `${pct}%` : '0%' }}
                          />
                          <span className="relative flex justify-between">
                            <span>{opt.text}</span>
                            {hasVoted && <span className="text-slate-500">{pct}%</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
