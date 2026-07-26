import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()
from apps.products.models import Product

def primary_url(p):
    imgs = list(p.images.all())
    if imgs:
        return imgs[0].resolved_url
    return None

featured = Product.objects.filter(is_featured=True, is_active=True).order_by('-created_at')[:8]
bestsellers = Product.objects.filter(is_active=True).order_by('-sold_count')[:8]
newarrivals = Product.objects.filter(is_active=True).order_by('-created_at')[:8]

print('Featured:')
for p in featured:
    print(p.id, p.name, primary_url(p))

print('\nBestSellers:')
for p in bestsellers:
    print(p.id, p.name, primary_url(p))

print('\nNewArrivals:')
for p in newarrivals:
    print(p.id, p.name, primary_url(p))
