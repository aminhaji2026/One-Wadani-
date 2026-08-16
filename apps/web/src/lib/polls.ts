export type PollOption = {
  id: string;
  label: string;
  votes: number;
};

export type Poll = {
  id: string;
  title: string;
  status: 'live' | 'current';
  closesAt: string;
  options: PollOption[];
};

export const POLLS: Poll[] = [
  {
    id: 'cost-of-living',
    title: 'What should Waddani prioritise first?',
    status: 'live',
    closesAt: 'Open now',
    options: [
      { id: 'costs', label: 'Lower living costs', votes: 428 },
      { id: 'jobs', label: 'Jobs & skills', votes: 312 },
      { id: 'services', label: 'Public services', votes: 267 },
      { id: 'integrity', label: 'Anti-corruption', votes: 198 },
    ],
  },
  {
    id: 'diaspora-engagement',
    title: 'How should diaspora members get involved this month?',
    status: 'current',
    closesAt: 'Closes 22 Aug',
    options: [
      { id: 'events', label: 'Join local events', votes: 156 },
      { id: 'volunteer', label: 'Volunteer remotely', votes: 121 },
      { id: 'donate', label: 'Support the campaign fund', votes: 98 },
      { id: 'membership', label: 'Register as a member', votes: 143 },
    ],
  },
  {
    id: 'youth-voice',
    title: 'Which youth programme should expand next?',
    status: 'current',
    closesAt: 'Closes 28 Aug',
    options: [
      { id: 'canvass', label: 'Canvass training', votes: 88 },
      { id: 'digital', label: 'Digital organising', votes: 102 },
      { id: 'debate', label: 'Town-hall debates', votes: 74 },
      { id: 'mentors', label: 'Mentorship circles', votes: 61 },
    ],
  },
];

const STORAGE_KEY = 'waddani_poll_votes';

type VoteMap = Record<string, string>;

function readVotes(): VoteMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as VoteMap;
  } catch {
    return {};
  }
}

function writeVotes(votes: VoteMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}

export function getPollsWithVotes(): Poll[] {
  const votes = typeof window === 'undefined' ? {} : readVotes();
  return POLLS.map((poll) => {
    const chosen = votes[poll.id];
    if (!chosen) return poll;
    return {
      ...poll,
      options: poll.options.map((opt) =>
        opt.id === chosen ? { ...opt, votes: opt.votes + 1 } : opt
      ),
    };
  });
}

export function getUserVote(pollId: string): string | null {
  return readVotes()[pollId] || null;
}

export function castVote(pollId: string, optionId: string): boolean {
  const votes = readVotes();
  if (votes[pollId]) return false;
  votes[pollId] = optionId;
  writeVotes(votes);
  return true;
}

export function totalVotes(poll: Poll): number {
  return poll.options.reduce((sum, opt) => sum + opt.votes, 0);
}
