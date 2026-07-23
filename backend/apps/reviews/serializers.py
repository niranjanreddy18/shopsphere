"""Serializers for the reviews domain."""

from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "product", "product_name", "user", "user_name", "rating", "comment", "is_approved", "created_at"]
        read_only_fields = ["id", "user", "user_name", "product_name", "is_approved", "created_at"]


class CreateReviewSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class SetReviewApprovalSerializer(serializers.Serializer):
    is_approved = serializers.BooleanField()
