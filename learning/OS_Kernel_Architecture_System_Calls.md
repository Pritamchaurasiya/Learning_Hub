# 💻 OS KERNEL ARCHITECTURE & SYSTEM CALLS

> [!IMPORTANT]
> The **Kernel** is the heart of the operating system. It acts as the bridge between software and hardware, managing resources like CPU time and memory.

---

## 🏛️ 1. MONOLITHIC VS. MICROKERNEL

- **Monolithic (Linux, Windows)**: All OS services (drivers, file system) run in the same kernel space. Faster but more complex.
- **Microkernel (QNX, L4)**: Only essential services run in kernel space. Others run as user-space processes. More stable and secure.

---

## 🔗 2. USER SPACE VS. KERNEL SPACE

- **User Space**: Where your apps (Flutter, Python) run. Restricted access.
- **Kernel Space**: Full access to hardware. Only trusted code runs here.
- **Context Switching**: The transition between user and kernel mode. This is "expensive" in terms of CPU cycles.

---

## 📞 3. SYSTEM CALLS (Syscalls)

System calls are the documented way to request a service from the kernel.

**Common Linux Syscalls:**

- `open()`: Access a file.
- `read()` / `write()`: Data I/O.
- `fork()`: Create a new process.
- `exec()`: Execute a program.
- `mmap()`: Map files or devices into memory.

---

## 🧠 4. MEMORY MANAGEMENT

- **Virtual Memory**: Giving each process the illusion that it has its own continuous block of memory.
- **MMU (Memory Management Unit)**: Hardware that translates virtual addresses to physical addresses.
- **Paging**: Dividing memory into fixed-size chunks to prevent fragmentation.

---

## 🧵 5. SCHEDULING (The Orchestrator)

The kernel's scheduler decides which process gets to use the CPU and for how long.

- **Preemptive Scheduling**: The kernel can interrupt a process to give another process a turn.
- **Interrupts**: Hardware signals that tell the CPU to stop what it's doing and handle an event (e.g., keyboard press).

---

## 🛡️ 6. BPF (Berkeley Packet Filter) / eBPF

Modern kernels (like Linux) now allow you to run small, secure programs _inside_ the kernel without crashing it. This is used for advanced observability and security.

---

## 🎓 CONCEPT: RING 0

CPUs have privilege levels. **Ring 0** is the most privileged (Kernel), while **Ring 3** is the least (Users).
