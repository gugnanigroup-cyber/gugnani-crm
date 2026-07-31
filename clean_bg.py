from PIL import Image

def remove_bg(img_path, out_path, tolerance=220):
    img = Image.open(img_path).convert('RGBA')
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # Check if pixel is close to white (R, G, B > tolerance)
        if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
            new_data.append((255, 255, 255, 0)) # Fully transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(out_path, 'PNG')

remove_bg('assets/logo_wide.png', 'assets/logo_wide_clean.png')
