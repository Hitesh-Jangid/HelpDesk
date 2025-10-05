"""
Rate limiting middleware for HelpDesk API
Implements 429 Too Many Requests response for excessive API usage
"""

from django.core.cache import cache
from django.http import JsonResponse
import time


class RateLimitMiddleware:
    """
    Rate limiting middleware using in-memory cache
    Limits: 100 requests per minute per IP address
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = 100  # requests per minute
        self.window = 60  # seconds
    
    def __call__(self, request):
        # Only apply rate limiting to API endpoints
        if request.path.startswith('/api/'):
            # Get client IP address
            client_ip = self.get_client_ip(request)
            cache_key = f"rate_limit_{client_ip}"
            
            # Get current request count and timestamp
            rate_data = cache.get(cache_key, {'count': 0, 'start': time.time()})
            
            current_time = time.time()
            time_elapsed = current_time - rate_data['start']
            
            # Reset counter if window has passed
            if time_elapsed > self.window:
                rate_data = {'count': 1, 'start': current_time}
                cache.set(cache_key, rate_data, self.window)
            else:
                # Check if rate limit exceeded
                if rate_data['count'] >= self.rate_limit:
                    retry_after = int(self.window - time_elapsed)
                    return JsonResponse({
                        'error': {
                            'code': 'RATE_LIMIT_EXCEEDED',
                            'message': f'Too many requests. Please try again in {retry_after} seconds.',
                            'retry_after': retry_after
                        }
                    }, status=429)
                
                # Increment counter
                rate_data['count'] += 1
                cache.set(cache_key, rate_data, self.window)
        
        return self.get_response(request)
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
