import string
import random

def generateRandomString(size):
    charrange = string.ascii_lowercase + string.ascii_uppercase + string.digits
    return ''.join(random.choice(charrange) for _ in range(size))
