import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from("todos").select();

  return (
    <ul className="container mx-auto px-4 py-8 space-y-2">
      {todos?.map((todo) => (
        <li key={todo.id} className="rounded-md border px-3 py-2">
          {todo.name}
        </li>
      ))}
    </ul>
  );
}
