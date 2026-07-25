1. Given Context
Problem: The company currently uses a Slack channel for "shout-outs," but it lacks
structure, data tracking, and tangible rewards. Management wants a dedicated web
application where recognition is quantifiable and can be exchanged for
company-funded perks.
Tech Stack Preference:
    ● Frontend: React 18+, TypeScript (strongly recommended).
    ● Backend: Node.js (TypeScript).
    ● Database: Relational (PostgreSQL, SQLite) for transactional note data and
    Redis for real-time synchronization.

2. Use Cases to Solve
Candidates must implement a Minimum Viable Product (MVP) that addresses these
three scenarios:
    1. Peer Recognition (The "Kudo"): A user can send 10–50 points to a colleague
    with a mandatory description, "Core Value" tag (e.g., #Teamwork, #Ownership)
    and media files (images, videos - maximum 3 mins ).

        ○ Constraint: Users have a monthly "Giving Budget" of 200 points that
    resets on the 1st of every month.
        ○ Requirement: Handle video uploads without blocking the server
    process.
    2. The Live Kudos Feed:
        ○ Users should be able to "react" (emoji), comment with text or media
    files (images, videos).
        ○ Users who are tagged in feeds can receive real-time notifications.
    3. Reward Redemption: A simple catalog (e.g., "Company Hoodie" - 500 pts,
    "Friday Afternoon Off" - 1000 pts).
        ○ Constraint: The system must prevent "double spending" if a user clicks
    "Redeem" multiple times rapidly.