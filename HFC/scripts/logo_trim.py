import os
from PIL import Image
import random
 
def nested_pixel_array(im, width, height):

    image_pixels = im.getdata()
    pixels = []
    pixel_ind = 0
    for x in range(0, width):
        pixel_row = []
        for y in range(0, height):
            pixel_row.append(image_pixels[pixel_ind])
            pixel_ind +=1
        pixels.append(pixel_row)
    
    return pixels

team_logo_dir_path = '/Users/tom/Code/Head-Football-Coach/HFC/img/team_logos'
file_list = os.listdir(team_logo_dir_path)

for file_name in file_list:
    if file_name == '.DS_Store':
        continue
    file_path = team_logo_dir_path + '/' + file_name
    im = Image.open(file_path)
    (width, height) = im.size

    pixels = nested_pixel_array(im, width, height)

    min_x, min_y = width, height
    max_x, max_y = 0, 0
    for x, pixel_row in enumerate(pixels):
        for y, pixel in enumerate(pixel_row):
            # print(x,y,pixel)
            if pixel[3] > 0:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    
    im1 = im.crop((min_y, min_x, max_y, max_x))
    im1 = im1.save(file_path)
    print('Saved ', file_path)