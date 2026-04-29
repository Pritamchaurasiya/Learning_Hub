
from django.db import transaction
from django.utils.text import slugify
from apps.users.models import Organization, OrganizationMember, User
import logging

logger = logging.getLogger(__name__)

class B2BService:
    """
    Enterprise B2B Logic Service.
    Manages Organizations, Seats, and Team Roles.
    """

    @staticmethod
    def create_organization(name: str, owner: User, plan: str = 'free') -> Organization:
        """
        Creates a new Organization for a user.
        """
        slug = slugify(name)
        
        # Ensure unique slug
        if Organization.objects.filter(slug=slug).exists():
            slug = f"{slug}-{owner.id}"

        with transaction.atomic():
            org = Organization.objects.create(
                name=name,
                slug=slug,
                owner=owner,
                subscription_plan=plan,
                max_seats=5 if plan == 'free' else 100
            )
            
            # Add owner as Admin
            OrganizationMember.objects.create(
                organization=org,
                user=owner,
                role=OrganizationMember.Role.ADMIN
            )
            return org

    @staticmethod
    def invite_member(org_id: int, email: str, role: str = 'member') -> OrganizationMember:
        """
        Invites a user to the organization.
        If user exists, adds them. If not, could trigger invite email (mocked).
        """
        try:
            org = Organization.objects.get(id=org_id)
            
            # 1. Check Seat Limit
            current_members = org.members.count()
            if current_members >= org.max_seats:
                raise ValueError("Organization Seat Limit Reached. Upgrade Plan.")
                
            # 2. Find or Create User (Stub)
            # In a real app, we would send an email invite if user doesn't exist.
            # Here for God Mode, we assume user must exist or we fail roughly.
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise ValueError("User not found. Please ask them to sign up first.")

            # 3. Add to Org
            if OrganizationMember.objects.filter(organization=org, user=user).exists():
                raise ValueError("User is already a member.")
                
            member = OrganizationMember.objects.create(
                organization=org,
                user=user,
                role=role
            )
            logger.info(f"Added {email} to {org.name} as {role}")
            return member

        except Exception as e:
            logger.error(f"Invite Failed: {e}")
            raise e

    @staticmethod
    def get_organization_stats(org_id: int) -> dict:
        """
        Returns aggregated stats for the organization.
        """
        org = Organization.objects.get(id=org_id)
        members = org.members.all()
        
        # Calculate total certificates earned by team
        total_certificates = 0
        for m in members:
            total_certificates += m.user.certificates.count()
            
        return {
            "name": org.name,
            "seats_used": members.count(),
            "seats_total": org.max_seats,
            "total_certificates": total_certificates,
            "plan": org.subscription_plan
        }
