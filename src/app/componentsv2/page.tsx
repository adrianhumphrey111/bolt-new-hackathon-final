"use client"

import { useState, useEffect } from "react"
import { 
  Button,
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
  Input,
  Label,
  Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch,
  Checkbox,
  RadioGroup, RadioGroupItem,
  Badge,
  Alert, AlertDescription, AlertTitle,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
  Avatar, AvatarFallback, AvatarImage,
  Calendar,
  Progress,
  Separator,
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
  Slider,
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
  Toggle
} from "@/componentsV2"
import { Moon, Sun, Palette, Check, X, Star, Heart, Settings, User, Mail, Phone, Calendar as CalendarIcon, Home } from "lucide-react"
import { availableStyles, applyStyle, type StyleConfig } from "@/lib/styles-config"

export default function ComponentsV2Showcase() {
  const [darkMode, setDarkMode] = useState(false)
  const [currentStyle, setCurrentStyle] = useState<StyleConfig>(availableStyles[1]) // Default to New York
  const [sliderValue, setSliderValue] = useState([50])
  const [progressValue, setProgressValue] = useState(33)
  const [isLoading, setIsLoading] = useState(false)

  // Apply initial style on component mount
  useEffect(() => {
    applyStyle(currentStyle, darkMode)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // Reapply the current style with the new dark mode setting
    applyStyle(currentStyle, newDarkMode)
  }

  const handleStyleChange = (styleName: string) => {
    const newStyle = availableStyles.find(style => style.name === styleName)
    if (newStyle) {
      setCurrentStyle(newStyle)
      applyStyle(newStyle, darkMode)
    }
  }

  const simulateLoading = () => {
    setIsLoading(true)
    let progress = 0
    const timer = setInterval(() => {
      progress += 10
      setProgressValue(progress)
      if (progress >= 100) {
        clearInterval(timer)
        setIsLoading(false)
        setProgressValue(33)
      }
    }, 200)
  }

  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">shadcn/ui Component Library</h1>
            <p className="text-muted-foreground">A showcase of all available shadcn/ui components with style variants</p>
          </div>
          <div className="flex items-center space-x-6">
            {/* Style Selector */}
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <Label htmlFor="style-select">Style</Label>
              <Select value={currentStyle.name} onValueChange={handleStyleChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStyles.map((style) => (
                    <SelectItem key={style.name} value={style.name}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Dark Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
              />
              {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </div>
          </div>
        </div>

        {/* Buttons Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button styles and states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
              <Button onClick={simulateLoading} disabled={isLoading}>
                {isLoading ? "Loading..." : "Start Loading"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Forms Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
            <CardDescription>Input fields, selects, and form controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="Enter your email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" placeholder="Enter your password" type="password" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Tell us about yourself" />
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms">Accept terms and conditions</Label>
              </div>
              
              <div className="space-y-2">
                <Label>Notification Preferences</Label>
                <RadioGroup defaultValue="email">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email-notif" />
                    <Label htmlFor="email-notif">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="sms-notif" />
                    <Label htmlFor="sms-notif">SMS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="no-notif" />
                    <Label htmlFor="no-notif">None</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Display Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data Display</CardTitle>
            <CardDescription>Badges, avatars, and other display components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Badges</Label>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Avatars</Label>
              <div className="flex space-x-4">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Progress</Label>
              <Progress value={progressValue} className="w-full" />
              <p className="text-sm text-muted-foreground">{progressValue}% complete</p>
            </div>

            <div className="space-y-2">
              <Label>Slider</Label>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">Value: {sliderValue[0]}</p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation & Layout Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Navigation & Layout</CardTitle>
            <CardDescription>Tabs, accordions, and separators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="space-y-2">
                <h3 className="text-lg font-medium">Account Settings</h3>
                <p className="text-muted-foreground">Manage your account information and preferences.</p>
              </TabsContent>
              <TabsContent value="password" className="space-y-2">
                <h3 className="text-lg font-medium">Password Settings</h3>
                <p className="text-muted-foreground">Change your password and security settings.</p>
              </TabsContent>
              <TabsContent value="settings" className="space-y-2">
                <h3 className="text-lg font-medium">General Settings</h3>
                <p className="text-muted-foreground">Configure your application preferences.</p>
              </TabsContent>
            </Tabs>

            <Separator />

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                  Yes. It comes with default styles that matches the other components&apos; aesthetic.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>
                  Yes. It&apos;s animated by default, but you can disable it if you prefer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Interactive Components Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Interactive Components</CardTitle>
            <CardDescription>Dialogs, dropdowns, and tooltips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Continue</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Open Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuItem>Team</DropdownMenuItem>
                  <DropdownMenuItem>Subscription</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover me</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is a tooltip</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Open Sheet</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Edit profile</SheetTitle>
                    <SheetDescription>
                      Make changes to your profile here. Click save when you&apos;re done.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input id="name" value="Pedro Duarte" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Username
                      </Label>
                      <Input id="username" value="@peduarte" className="col-span-3" />
                    </div>
                  </div>
                  <SheetFooter>
                    <Button type="submit">Save changes</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              <div className="flex space-x-2">
                <Toggle aria-label="Toggle italic">
                  <Star className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Toggle bold">
                  <Heart className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Toggle settings">
                  <Settings className="h-4 w-4" />
                </Toggle>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data Table</CardTitle>
            <CardDescription>Example table with sample data</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>A list of your recent invoices.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">INV001</TableCell>
                  <TableCell><Badge variant="secondary">Paid</Badge></TableCell>
                  <TableCell>Credit Card</TableCell>
                  <TableCell className="text-right">$250.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">INV002</TableCell>
                  <TableCell><Badge variant="outline">Pending</Badge></TableCell>
                  <TableCell>PayPal</TableCell>
                  <TableCell className="text-right">$150.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">INV003</TableCell>
                  <TableCell><Badge>Paid</Badge></TableCell>
                  <TableCell>Bank Transfer</TableCell>
                  <TableCell className="text-right">$350.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Calendar Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Date picker component</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar mode="single" className="rounded-md border" />
          </CardContent>
        </Card>

        {/* Alerts Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Various alert types and styles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CalendarIcon className="h-4 w-4" />
              <AlertTitle>Heads up!</AlertTitle>
              <AlertDescription>
                You can add components to your app using the cli.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Your session has expired. Please log in again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-muted-foreground py-8">
          <p>Built with shadcn/ui components • Try different styles: {availableStyles.map(s => s.label).join(', ')} • Toggle dark mode to see theme changes</p>
        </div>
      </div>
    </div>
  )
}