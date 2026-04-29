from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import Web3ProfileView, NFTCertificateViewSet

router = DefaultRouter()
router.register(r'certificates', NFTCertificateViewSet, basename='nft-certificate')

app_name = 'web3'

urlpatterns = [
    path('profile/', Web3ProfileView.as_view(), name='web3-profile'),
    path('', include(router.urls)),
]
