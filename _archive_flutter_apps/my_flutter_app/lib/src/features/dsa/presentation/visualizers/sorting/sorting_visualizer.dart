import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

class SortingVisualizer extends StatefulWidget {
  const SortingVisualizer({super.key});

  @override
  State<SortingVisualizer> createState() => _SortingVisualizerState();
}

class _SortingVisualizerState extends State<SortingVisualizer> {
  List<int> _numbers = [];
  final int _sampleSize = 50;
  final int _maxHeight = 300;
  bool _isSorting = false;
  String _currentAlgo = 'None';

  @override
  void initState() {
    super.initState();
    _resetArray();
  }

  void _resetArray() {
    if (_isSorting) {
      return;
    }
    setState(() {
      _numbers =
          List.generate(_sampleSize, (_) => Random().nextInt(_maxHeight) + 10);
      _currentAlgo = 'None';
    });
  }

  Future<void> _bubbleSort() async {
    setState(() {
      _isSorting = true;
      _currentAlgo = 'Bubble Sort';
    });

    for (var i = 0; i < _numbers.length; i++) {
      for (var j = 0; j < _numbers.length - 1 - i; j++) {
        if (_numbers[j] > _numbers[j + 1]) {
          setState(() {
            final temp = _numbers[j];
            _numbers[j] = _numbers[j + 1];
            _numbers[j + 1] = temp;
          });
          await Future<void>.delayed(const Duration(milliseconds: 10));
        }
        if (!mounted) {
          return;
        }
      }
    }

    setState(() => _isSorting = false);
  }

  Future<void> _quickSortHelper(List<int> arr, int low, int high) async {
    if (low < high) {
      final pi = await _partition(arr, low, high);
      await _quickSortHelper(arr, low, pi - 1);
      await _quickSortHelper(arr, pi + 1, high);
    }
  }

  Future<int> _partition(List<int> arr, int low, int high) async {
    final pivot = arr[high];
    var i = low - 1;
    for (var j = low; j < high; j++) {
      if (arr[j] < pivot) {
        i++;
        setState(() {
          final temp = arr[i];
          arr[i] = arr[j];
          arr[j] = temp;
        });
        await Future<void>.delayed(const Duration(milliseconds: 20));
      }
      if (!mounted) {
        return high;
      }
    }
    setState(() {
      final temp = arr[i + 1];
      arr[i + 1] = arr[high];
      arr[high] = temp;
    });
    await Future<void>.delayed(const Duration(milliseconds: 20));
    return i + 1;
  }

  Future<void> _quickSort() async {
    setState(() {
      _isSorting = true;
      _currentAlgo = 'Quick Sort';
    });
    await _quickSortHelper(_numbers, 0, _numbers.length - 1);
    setState(() => _isSorting = false);
  }

  Future<void> _mergeSortHelper(List<int> arr, int l, int r) async {
    if (l < r) {
      final m = l + (r - l) ~/ 2;
      await _mergeSortHelper(arr, l, m);
      await _mergeSortHelper(arr, m + 1, r);
      await _merge(arr, l, m, r);
    }
  }

  Future<void> _merge(List<int> arr, int l, int m, int r) async {
    final n1 = m - l + 1;
    final n2 = r - m;

    final L = List<int>.filled(n1, 0);
    final R = List<int>.filled(n2, 0);

    for (var i = 0; i < n1; i++) {
      L[i] = arr[l + i];
    }
    for (var j = 0; j < n2; j++) {
      R[j] = arr[m + 1 + j];
    }

    var i = 0;
    var j = 0;
    var k = l;

    while (i < n1 && j < n2) {
      if (L[i] <= R[j]) {
        setState(() {
          arr[k] = L[i];
        });
        i++;
      } else {
        setState(() {
          arr[k] = R[j];
        });
        j++;
      }
      k++;
      await Future<void>.delayed(const Duration(milliseconds: 20));
      if (!mounted) {
        return;
      }
    }

    while (i < n1) {
      setState(() {
        arr[k] = L[i];
      });
      i++;
      k++;
      await Future<void>.delayed(const Duration(milliseconds: 20));
      if (!mounted) {
        return;
      }
    }

    while (j < n2) {
      setState(() {
        arr[k] = R[j];
      });
      j++;
      k++;
      await Future<void>.delayed(const Duration(milliseconds: 20));
      if (!mounted) {
        return;
      }
    }
  }

  Future<void> _mergeSort() async {
    setState(() {
      _isSorting = true;
      _currentAlgo = 'Merge Sort';
    });
    await _mergeSortHelper(_numbers, 0, _numbers.length - 1);
    setState(() => _isSorting = false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Algo: $_currentAlgo',
                  style: Theme.of(context).textTheme.titleLarge),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: _isSorting ? null : _resetArray,
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _isSorting ? null : _bubbleSort,
                    child: const Text('Bubble'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _isSorting ? null : _quickSort,
                    child: const Text('Quick'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _isSorting ? null : _mergeSort,
                    child: const Text('Merge'),
                  ),
                ],
              )
            ],
          ),
        ),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            alignment: Alignment.bottomCenter,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: _numbers.map((height) {
                return Flexible(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 1),
                    height: height.toDouble(),
                    decoration: BoxDecoration(
                      color: Colors.blueAccent,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}
