import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:learning_hub/core/theme/app_colors.dart';

class CategoriesSection extends StatelessWidget {
  const CategoriesSection({super.key});

  @override
  Widget build(BuildContext context) {
    final categories = [
      const Category('Development', Icons.code, AppColors.categoryDevelopment),
      const Category('Design', Icons.design_services, AppColors.categoryDesign),
      const Category('Business', Icons.business, AppColors.categoryBusiness),
      const Category('Marketing', Icons.campaign, AppColors.categoryMarketing),
      const Category('Data Science', Icons.analytics, AppColors.categoryData),
      const Category('AI & ML', Icons.psychology, AppColors.categoryAI),
      const Category('Mobile', Icons.phone_android, AppColors.categoryMobile),
      const Category('Cloud', Icons.cloud, AppColors.categoryCloud),
    ];

    return SizedBox(
      height: 100,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final category = categories[index];
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: CategoryCard(category: category),
          )
              .animate()
              .fadeIn(delay: (50 * index).ms, duration: 300.ms)
              .scale(begin: const Offset(0.9, 0.9));
        },
      ),
    );
  }
}

class CategoryCard extends StatelessWidget {
  final Category category;

  const CategoryCard({super.key, required this.category});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      width: 90,
      child: Card(
        margin: EdgeInsets.zero,
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: InkWell(
          onTap: () =>
              context.push('/search?category=${category.name.toLowerCase()}'),
          borderRadius: BorderRadius.circular(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: category.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  category.icon,
                  color: category.color,
                  size: 22,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                category.name,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class Category {
  final String name;
  final IconData icon;
  final Color color;

  const Category(this.name, this.icon, this.color);
}
