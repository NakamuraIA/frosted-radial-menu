// Models/StateManager.cs — Máquina de estados para navegação recursiva.
// Port 1:1 de state_manager.py
using System;
using System.Collections.Generic;
using System.Linq;

namespace MenuRadialCS.Models;

/// <summary>Pilha de navegação por níveis do menu radial.</summary>
public class StateManager
{
    private readonly List<List<MenuItem>> _stack = new();

    public event Action<List<MenuItem>, int, string>? LevelChanged;
    public event Action? MenuClosed;

    public void Reset(List<MenuItem> rootItems)
    {
        _stack.Clear();
        _stack.Add(rootItems);
        LevelChanged?.Invoke(Current, Depth, "forward");
    }

    public void Push(List<MenuItem> children)
    {
        _stack.Add(children);
        LevelChanged?.Invoke(Current, Depth, "forward");
    }

    public void Pop()
    {
        if (_stack.Count > 1)
        {
            _stack.RemoveAt(_stack.Count - 1);
            LevelChanged?.Invoke(Current, Depth, "backward");
        }
        else
        {
            MenuClosed?.Invoke();
        }
    }

    public List<MenuItem> Current => _stack.Count > 0 ? _stack[^1] : new();
    public int Depth => _stack.Count;

    public List<List<MenuItem>> GhostLevels =>
        _stack.Count > 1 ? _stack.Take(_stack.Count - 1).ToList() : new();

    public void Clear() => _stack.Clear();
}
