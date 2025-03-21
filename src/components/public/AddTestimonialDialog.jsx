import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from 'lucide-react';
import { Testimonial } from '@/api/entities';

export default function AddTestimonialDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !text || !rating) return;

    setIsSubmitting(true);
    try {
      await Testimonial.create({
        name,
        text,
        rating,
        approved: false
      });
      
      setIsOpen(false);
      setName('');
      setText('');
      setRating(5);
      alert('Obrigado pelo seu depoimento! Ele será exibido após aprovação.');
    } catch (error) {
      console.error('Erro ao enviar depoimento:', error);
      alert('Erro ao enviar depoimento. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white text-[#294380] hover:bg-[#F1F6CE]">
          Deixar um Depoimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deixe seu Depoimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Textarea
              placeholder="Conte sua experiência..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="min-h-[100px]"
            />
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className="focus:outline-none"
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(value)}
              >
                <Star
                  className={`w-6 h-6 ${
                    value <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <Button
            type="submit"
            className="w-full bg-[#294380] hover:bg-[#0D0F36]"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Depoimento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}