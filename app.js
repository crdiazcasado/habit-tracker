const SUPABASE_URL = 'https://xtpfxjxdohzzlxjimmxx.supabase.co';  
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cGZ4anhkb2h6emx4amltbXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU5ODUsImV4cCI6MjA4NTkwMTk4NX0.USIwuWlORdSg3x5qahNM7mmSJ1VGFBFPbrmNTTgkRy8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Función para cargar todos los hábitos
async function loadHabits() {
    const habitsList = document.getElementById('habitsList');
    habitsList.innerHTML = '<div class="loading">Cargando hábitos...</div>';

    const { data: habits, error } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        habitsList.innerHTML = '<div class="loading">Error al cargar hábitos</div>';
        return;
    }

    if (habits.length === 0) {
        habitsList.innerHTML = '<div class="loading">Aún no tienes hábitos. ¡Crea uno arriba! 👆</div>';
        return;
    }

    habitsList.innerHTML = '';
    
    for (const habit of habits) {
        await renderHabit(habit);
    }
}

// Función para renderizar un hábito individual
async function renderHabit(habit) {
    const habitsList = document.getElementById('habitsList');
    
    // Obtener completados de los últimos 7 días
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    
    const { data: completions } = await supabase
        .from('completions')
        .select('completed_date')
        .eq('habit_id', habit.id)
        .gte('completed_date', sevenDaysAgo.toISOString().split('T')[0])
        .lte('completed_date', today.toISOString().split('T')[0]);

    const completedDates = new Set(completions?.map(c => c.completed_date) || []);
    
    // Calcular racha
    const streak = await calculateStreak(habit.id);
    
    // Crear HTML del hábito
    const habitCard = document.createElement('div');
    habitCard.className = 'habit-card';
    
    let weekHTML = '';
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = days[date.getDay()];
        const dayNumber = date.getDate();
        const isCompleted = completedDates.has(dateStr);
        
        weekHTML += `
            <div class="day-box ${isCompleted ? 'completed' : ''}" 
                 onclick="toggleDay('${habit.id}', '${dateStr}')">
                <div class="day-name">${dayName}</div>
                <div class="day-number">${dayNumber}</div>
            </div>
        `;
    }
    
    habitCard.innerHTML = `
        <div class="habit-header">
            <div class="habit-color" style="background: ${habit.color}"></div>
            <h3>${habit.name}</h3>
            <div class="streak">🔥 ${streak} días</div>
        </div>
        <div class="week-grid">
            ${weekHTML}
        </div>
        <button class="delete-btn" onclick="deleteHabit('${habit.id}')">Eliminar</button>
    `;
    
    habitsList.appendChild(habitCard);
}

// Calcular racha (días consecutivos hasta hoy)
async function calculateStreak(habitId) {
    const { data: completions } = await supabase
        .from('completions')
        .select('completed_date')
        .eq('habit_id', habitId)
        .order('completed_date', { ascending: false });

    if (!completions || completions.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = new Date(today);

    for (const completion of completions) {
        const completedDate = completion.completed_date;
        const checkDate = currentDate.toISOString().split('T')[0];
        
        if (completedDate === checkDate) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

// Añadir nuevo hábito
async function addHabit() {
    const name = document.getElementById('habitName').value.trim();
    const color = document.getElementById('habitColor').value;

    if (!name) {
        alert('Por favor escribe el nombre del hábito');
        return;
    }

    const { error } = await supabase
        .from('habits')
        .insert([{ name, color }]);

    if (error) {
        console.error('Error:', error);
        alert('Error al crear hábito');
        return;
    }

    document.getElementById('habitName').value = '';
    loadHabits();
}

// Marcar/desmarcar día
async function toggleDay(habitId, date) {
    // Verificar si ya está completado
    const { data: existing } = await supabase
        .from('completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completed_date', date)
        .single();

    if (existing) {
        // Si existe, eliminarlo
        await supabase
            .from('completions')
            .delete()
            .eq('id', existing.id);
    } else {
        // Si no existe, crearlo
        await supabase
            .from('completions')
            .insert([{ habit_id: habitId, completed_date: date }]);
    }

    loadHabits();
}

// Eliminar hábito
async function deleteHabit(habitId) {
    if (!confirm('¿Segura que quieres eliminar este hábito?')) return;

    const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

    if (error) {
        console.error('Error:', error);
        alert('Error al eliminar hábito');
        return;
    }

    loadHabits();
}

// Cargar hábitos al inicio
loadHabits();
