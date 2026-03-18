import os
from PIL import Image, ImageEnhance

def add_watermark(
    input_folder,        # 待处理图片的文件夹路径
    watermark_path,      # 水印图片路径
    output_folder,       # 输出文件夹路径
    opacity=0.2,         # 水印透明度 (0-1，越小越透明)
    margin=20,           # 水印到图片边缘的边距（像素）
    webp_quality=85,     # webp输出质量 (0-100)
    watermark_scale=0.2  # 水印缩放比例（水印宽度占原图宽度的比例，0-1）
):
    """
    给指定文件夹的图片添加右下角半透明水印，并输出为webp格式
    新增：水印按原图比例自适应缩放
    """
    # 确保输出文件夹存在
    os.makedirs(output_folder, exist_ok=True)
    
    # 支持的图片格式
    supported_formats = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif')
    
    try:
        # 加载水印图片并转为RGBA模式（支持透明度）
        watermark = Image.open(watermark_path).convert("RGBA")
        # 获取原始水印尺寸
        orig_wm_width, orig_wm_height = watermark.size
    except Exception as e:
        print(f"加载水印图片失败: {e}")
        return
    
    # 遍历输入文件夹中的所有文件
    for filename in os.listdir(input_folder):
        # 跳过非图片文件
        if not filename.lower().endswith(supported_formats):
            continue
        
        # 构建完整文件路径
        img_path = os.path.join(input_folder, filename)
        # 构建输出文件名（替换为webp格式）
        output_filename = os.path.splitext(filename)[0] + ".webp"
        output_path = os.path.join(output_folder, output_filename)
        
        try:
            # 打开原始图片并转为RGBA模式
            with Image.open(img_path).convert("RGBA") as base_img:
                img_width, img_height = base_img.size
                
                # ========== 新增：按比例缩放水印 ==========
                # 计算水印目标宽度（按原图宽度的比例）
                target_wm_width = int(img_width * watermark_scale)
                # 按宽高比计算目标高度，保持水印比例不变
                ratio = orig_wm_height / orig_wm_width
                target_wm_height = int(target_wm_width * ratio)
                # 缩放水印图片
                watermark_resized = watermark.resize((target_wm_width, target_wm_height), Image.Resampling.LANCZOS)
                # =========================================
                
                # 计算水印位置（右下角，留出边距）
                position = (
                    img_width - target_wm_width - margin,
                    img_height - target_wm_height - margin
                )
                
                # 创建水印图层（用于设置透明度）
                watermark_layer = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
                watermark_layer.paste(watermark_resized, position)
                
                # 调整水印透明度
                alpha = watermark_layer.split()[3]
                alpha = ImageEnhance.Brightness(alpha).enhance(opacity)
                watermark_layer.putalpha(alpha)
                
                # 合并原图和水印
                result = Image.alpha_composite(base_img, watermark_layer)
                
                # 转换为RGB模式（webp不支持纯RGBA的某些情况）并保存
                result.save(output_path, "WEBP", quality=webp_quality)
                
                print(f"成功处理: {filename} -> {output_filename} "
                      f"(水印尺寸: {target_wm_width}x{target_wm_height})")
                
        except Exception as e:
            print(f"处理 {filename} 失败: {e}")

if __name__ == "__main__":
    # ===================== 配置参数 =====================
    INPUT_FOLDER = "./commission"    # 待处理图片文件夹
    WATERMARK_PATH = "./watermark.png" # 水印图片路径（建议用透明背景的png）
    OUTPUT_FOLDER = "./output_webp"    # 输出文件夹
    WATERMARK_OPACITY = 0.75            # 水印透明度（0.2=20%）
    MARGIN_PIXELS = 20                 # 水印到边缘的距离
    WEBP_QUALITY = 85                  # webp质量（越高文件越大）
    WATERMARK_SCALE = 0.2              # 水印缩放比例（0.2表示水印宽度为原图的20%）
    # ====================================================
    
    # 执行水印添加
    add_watermark(
        input_folder=INPUT_FOLDER,
        watermark_path=WATERMARK_PATH,
        output_folder=OUTPUT_FOLDER,
        opacity=WATERMARK_OPACITY,
        margin=MARGIN_PIXELS,
        webp_quality=WEBP_QUALITY,
        watermark_scale=WATERMARK_SCALE  # 新增参数
    )
    
    print("\n处理完成！")