from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
import uuid

from apps.courses.models import Course, Enrollment
from .models import NFTCertificate, UserProfileWeb3
from .serializers import NFTCertificateSerializer, UserProfileWeb3Serializer
from .credential_service import BlockchainCredentialService, Certificate

class Web3ProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, created = UserProfileWeb3.objects.get_or_create(user=request.user)
        if created or not profile.did:
            # Auto-generate DID
            profile.did = BlockchainCredentialService.generate_did(str(request.user.id))
            profile.save()
            
        serializer = UserProfileWeb3Serializer(profile)
        return Response(serializer.data)

    def post(self, request):
        profile, _ = UserProfileWeb3.objects.get_or_create(user=request.user)
        wallet_address = request.data.get('wallet_address')
        
        if wallet_address:
            profile.wallet_address = wallet_address
            profile.save()
            
        serializer = UserProfileWeb3Serializer(profile)
        return Response(serializer.data)


class NFTCertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for users to see their certificates.
    Minting is handled via specialized actions.
    """
    serializer_class = NFTCertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NFTCertificate.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='mint')
    def mint_certificate(self, request):
        """
        Request to mint an NFT Certificate for a completed course.
        """
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({"error": "course_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        course = get_object_or_404(Course, id=course_id)
        
        # Verify enrollment & completion
        enrollment = get_object_or_404(Enrollment, user=request.user, course=course)
        
        if enrollment.progress < 100:
            return Response({"error": "Course not 100% completed"}, status=status.HTTP_400_BAD_REQUEST)
            
        if NFTCertificate.objects.filter(user=request.user, course=course).exists():
            return Response({"error": "Certificate already minted"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Ensure Web3 profile exists
        profile, _ = UserProfileWeb3.objects.get_or_create(user=request.user)
        if not profile.did:
            profile.did = BlockchainCredentialService.generate_did(str(request.user.id))
            profile.save()
            
        # Mint via mock blockchain service
        cert_id = str(uuid.uuid4())
        mock_cert = Certificate(
            id=cert_id,
            recipient_did=profile.did,
            course_id=str(course.id),
            issue_date="NOW",
            grade="Passed"
        )
        
        # Issue singleton batch
        result = BlockchainCredentialService.issue_certificate_batch([mock_cert])
        
        # Prepare Metadata for IPFS
        metadata = {
            "name": f"Certificate of Completion: {course.title}",
            "description": f"Verifiable credential for {request.user.display_name} for completing {course.title}.",
            "image": f"ipfs://Qm-mock-image-hash-{course.id}",
            "attributes": [
                {"trait_type": "Student", "value": request.user.display_name},
                {"trait_type": "Course", "value": course.title},
                {"trait_type": "Grade", "value": "Passed"},
                {"trait_type": "DID", "value": profile.did}
            ],
            "blockchain_data": {
                "merkle_root": result['batch_root'],
                "transaction_hash": result['transaction_hash']
            }
        }
        
        from apps.core.storage.ipfs import IPFSClient
        metadata_cid = IPFSClient.pin_json(metadata)
        
        # Create DB record
        nft = NFTCertificate.objects.create(
            user=request.user,
            course=course,
            token_id=cert_id,
            merkle_root=result['batch_root'],
            transaction_hash=result['transaction_hash'],
            merkle_proof=result['merkle_proofs'].get(cert_id, []),
            metadata_uri=f"ipfs://{metadata_cid}"
        )
        
        return Response(NFTCertificateSerializer(nft).data, status=status.HTTP_201_CREATED)
