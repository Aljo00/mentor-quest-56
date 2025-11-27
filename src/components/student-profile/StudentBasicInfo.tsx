import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Calendar, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Student {
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  plan_name: string;
  plan_amount: number;
  batch: string | null;
  joining_date: string;
  tags: string[] | null;
}

interface StudentBasicInfoProps {
  student: Student;
}

export const StudentBasicInfo = ({ student }: StudentBasicInfoProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{student.full_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{student.phone}</span>
        </div>
        
        {student.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{student.email}</span>
          </div>
        )}
        
        {student.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span>{student.address}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Joined: {new Date(student.joining_date).toLocaleDateString()}</span>
        </div>
        
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-1">Plan</p>
          <p className="text-lg font-semibold">{student.plan_name}</p>
          <p className="text-sm text-muted-foreground">₹{student.plan_amount.toLocaleString()}</p>
        </div>
        
        {student.tags && student.tags.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Tags</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {student.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
