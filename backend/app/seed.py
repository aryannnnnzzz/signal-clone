"""
Database seeder — creates demo users, conversations, and messages.
Run with: python -m app.seed
"""

import asyncio
from datetime import datetime, timedelta, timezone

from app.database import Base, async_session_maker, engine
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus
from app.models.user import User
from app.services.auth_service import hash_password


async def seed():
    """Populate the database with sample data."""
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as db:
        # Check if already seeded
        from sqlalchemy import select, func

        result = await db.execute(select(func.count(User.id)))
        count = result.scalar()
        if count > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")
        now = datetime.now(timezone.utc)

        # ── Users ──────────────────────────────────────────────────────────
        users_data = [
            {
                "id": "user-alice-001",
                "username": "alice",
                "display_name": "Alice Johnson",
                "phone_number": "+1234567890",
                "password_hash": hash_password("password"),
                "is_online": False,
            },
            {
                "id": "user-bob-002",
                "username": "bob",
                "display_name": "Bob Smith",
                "phone_number": "+1234567891",
                "password_hash": hash_password("password"),
                "is_online": False,
            },
            {
                "id": "user-charlie-003",
                "username": "charlie",
                "display_name": "Charlie Brown",
                "phone_number": "+1234567892",
                "password_hash": hash_password("password"),
                "is_online": False,
            },
            {
                "id": "user-diana-004",
                "username": "diana",
                "display_name": "Diana Prince",
                "phone_number": "+1234567893",
                "password_hash": hash_password("password"),
                "is_online": False,
            },
            {
                "id": "user-eve-005",
                "username": "eve",
                "display_name": "Eve Wilson",
                "phone_number": "+1234567894",
                "password_hash": hash_password("password"),
                "is_online": False,
            },
        ]

        users = []
        for data in users_data:
            user = User(**data)
            db.add(user)
            users.append(user)

        await db.flush()
        alice, bob, charlie, diana, eve = users
        print(f"  Created {len(users)} users")

        # ── Contacts ───────────────────────────────────────────────────────
        contacts_data = [
            # Alice's contacts
            (alice.id, bob.id, None),
            (alice.id, charlie.id, "Chuck"),
            (alice.id, diana.id, None),
            (alice.id, eve.id, None),
            # Bob's contacts
            (bob.id, alice.id, None),
            (bob.id, charlie.id, None),
            (bob.id, diana.id, None),
            # Charlie's contacts
            (charlie.id, alice.id, None),
            (charlie.id, bob.id, None),
            (charlie.id, eve.id, None),
            # Diana's contacts
            (diana.id, alice.id, None),
            (diana.id, bob.id, None),
            # Eve's contacts
            (eve.id, alice.id, None),
            (eve.id, charlie.id, None),
        ]

        for owner_id, contact_id, nickname in contacts_data:
            contact = Contact(
                owner_id=owner_id,
                contact_user_id=contact_id,
                nickname=nickname,
            )
            db.add(contact)

        print(f"  Created {len(contacts_data)} contacts")

        # ── DM Conversations ──────────────────────────────────────────────
        # Alice <-> Bob DM
        dm_alice_bob = Conversation(
            id="conv-dm-ab-001",
            type="dm",
            created_by=alice.id,
            updated_at=now - timedelta(minutes=5),
        )
        db.add(dm_alice_bob)
        await db.flush()

        db.add(ConversationMember(
            conversation_id=dm_alice_bob.id, user_id=alice.id,
            role="member", last_read_at=now - timedelta(minutes=5),
        ))
        db.add(ConversationMember(
            conversation_id=dm_alice_bob.id, user_id=bob.id,
            role="member", last_read_at=now - timedelta(minutes=10),
        ))

        # Alice <-> Charlie DM
        dm_alice_charlie = Conversation(
            id="conv-dm-ac-002",
            type="dm",
            created_by=alice.id,
            updated_at=now - timedelta(hours=2),
        )
        db.add(dm_alice_charlie)
        await db.flush()

        db.add(ConversationMember(
            conversation_id=dm_alice_charlie.id, user_id=alice.id,
            role="member", last_read_at=now - timedelta(hours=2),
        ))
        db.add(ConversationMember(
            conversation_id=dm_alice_charlie.id, user_id=charlie.id,
            role="member", last_read_at=now - timedelta(hours=3),
        ))

        # Bob <-> Diana DM
        dm_bob_diana = Conversation(
            id="conv-dm-bd-003",
            type="dm",
            created_by=bob.id,
            updated_at=now - timedelta(hours=1),
        )
        db.add(dm_bob_diana)
        await db.flush()

        db.add(ConversationMember(
            conversation_id=dm_bob_diana.id, user_id=bob.id,
            role="member", last_read_at=now - timedelta(hours=1),
        ))
        db.add(ConversationMember(
            conversation_id=dm_bob_diana.id, user_id=diana.id,
            role="member", last_read_at=now - timedelta(hours=1),
        ))

        print("  Created 3 DM conversations")

        # ── Group Conversations ────────────────────────────────────────────
        # Project Team group
        group_team = Conversation(
            id="conv-group-team-001",
            type="group",
            group_name="Project Team",
            created_by=alice.id,
            updated_at=now - timedelta(minutes=30),
        )
        db.add(group_team)
        await db.flush()

        for uid, role in [(alice.id, "admin"), (bob.id, "member"), (charlie.id, "member"), (diana.id, "member")]:
            db.add(ConversationMember(
                conversation_id=group_team.id, user_id=uid,
                role=role, last_read_at=now - timedelta(minutes=45),
            ))

        # Friends group
        group_friends = Conversation(
            id="conv-group-friends-002",
            type="group",
            group_name="Friends",
            created_by=charlie.id,
            updated_at=now - timedelta(hours=3),
        )
        db.add(group_friends)
        await db.flush()

        for uid, role in [(charlie.id, "admin"), (alice.id, "member"), (eve.id, "member")]:
            db.add(ConversationMember(
                conversation_id=group_friends.id, user_id=uid,
                role=role, last_read_at=now - timedelta(hours=4),
            ))

        print("  Created 2 group conversations")

        # ── Messages ──────────────────────────────────────────────────────
        messages_data = [
            # Alice <-> Bob DM
            (dm_alice_bob.id, alice.id, "Hey Bob! How are you?", now - timedelta(minutes=30)),
            (dm_alice_bob.id, bob.id, "Hi Alice! I'm doing great, thanks for asking!", now - timedelta(minutes=28)),
            (dm_alice_bob.id, alice.id, "Did you finish the report?", now - timedelta(minutes=25)),
            (dm_alice_bob.id, bob.id, "Almost done. Just need to review the final section.", now - timedelta(minutes=20)),
            (dm_alice_bob.id, alice.id, "Great! Let me know when it's ready.", now - timedelta(minutes=15)),
            (dm_alice_bob.id, bob.id, "Will do! Should be done by end of day.", now - timedelta(minutes=10)),
            (dm_alice_bob.id, alice.id, "Perfect, thanks! 👍", now - timedelta(minutes=5)),

            # Alice <-> Charlie DM
            (dm_alice_charlie.id, charlie.id, "Hey Alice, want to grab lunch tomorrow?", now - timedelta(hours=3)),
            (dm_alice_charlie.id, alice.id, "Sure! Where were you thinking?", now - timedelta(hours=2, minutes=50)),
            (dm_alice_charlie.id, charlie.id, "How about that new place downtown?", now - timedelta(hours=2, minutes=45)),
            (dm_alice_charlie.id, alice.id, "Sounds good! Let's meet at noon.", now - timedelta(hours=2)),

            # Bob <-> Diana DM
            (dm_bob_diana.id, diana.id, "Bob, can you send me the slides?", now - timedelta(hours=2)),
            (dm_bob_diana.id, bob.id, "Sure, I'll send them over in a bit.", now - timedelta(hours=1, minutes=45)),
            (dm_bob_diana.id, diana.id, "Thanks!", now - timedelta(hours=1)),

            # Project Team group
            (group_team.id, alice.id, "Team meeting at 3 PM today!", now - timedelta(hours=2)),
            (group_team.id, bob.id, "Got it, I'll be there.", now - timedelta(hours=1, minutes=50)),
            (group_team.id, charlie.id, "Can we push it to 3:30? I have a conflict.", now - timedelta(hours=1, minutes=40)),
            (group_team.id, alice.id, "Sure, 3:30 works for everyone?", now - timedelta(hours=1, minutes=30)),
            (group_team.id, diana.id, "3:30 is fine with me!", now - timedelta(hours=1, minutes=20)),
            (group_team.id, bob.id, "Works for me too.", now - timedelta(hours=1, minutes=10)),
            (group_team.id, alice.id, "Great, see everyone at 3:30 then! 🎉", now - timedelta(minutes=30)),

            # Friends group
            (group_friends.id, charlie.id, "Movie night this Friday? 🎬", now - timedelta(hours=5)),
            (group_friends.id, eve.id, "Yes! What are we watching?", now - timedelta(hours=4, minutes=30)),
            (group_friends.id, alice.id, "I'm in! Let's vote on the movie.", now - timedelta(hours=4)),
            (group_friends.id, charlie.id, "How about a sci-fi marathon?", now - timedelta(hours=3)),
        ]

        created_messages = []
        for conv_id, sender_id, content, created_at in messages_data:
            msg = Message(
                conversation_id=conv_id,
                sender_id=sender_id,
                content=content,
                content_type="text",
                created_at=created_at,
            )
            db.add(msg)
            created_messages.append((msg, conv_id, sender_id))

        await db.flush()
        print(f"  Created {len(messages_data)} messages")

        # ── Message Statuses ──────────────────────────────────────────────
        # Create "read" status for all messages (simulating a conversation where everyone has seen everything)
        status_count = 0
        for msg, conv_id, sender_id in created_messages:
            # Get all members of the conversation except the sender
            result = await db.execute(
                select(ConversationMember.user_id).where(
                    ConversationMember.conversation_id == conv_id,
                    ConversationMember.user_id != sender_id,
                )
            )
            recipient_ids = list(result.scalars().all())

            for rid in recipient_ids:
                ms = MessageStatus(
                    message_id=msg.id,
                    user_id=rid,
                    status="read",
                    timestamp=msg.created_at + timedelta(minutes=2),
                )
                db.add(ms)
                status_count += 1

        print(f"  Created {status_count} message statuses")

        await db.commit()
        print("\n[OK] Database seeded successfully!")
        print("\nLogin credentials (all passwords: 'password'):")
        for u in users_data:
            print(f"   • {u['username']} — {u['display_name']}")


if __name__ == "__main__":
    asyncio.run(seed())
