from rest_framework import serializers
from .models import NFTCertificate, UserProfileWeb3

class UserProfileWeb3Serializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfileWeb3
        fields = ['wallet_address', 'did']
        read_only_fields = ['did']

class NFTCertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = NFTCertificate
        fields = [
            'id', 'user', 'username', 'course', 'course_title', 
            'token_id', 'merkle_root', 'merkle_proof', 
            'transaction_hash', 'metadata_uri', 'is_revoked', 
            'created_at'
        ]
        read_only_fields = [
            'token_id', 'merkle_root', 'merkle_proof', 
            'transaction_hash', 'metadata_uri', 'is_revoked', 
            'created_at'
        ]
