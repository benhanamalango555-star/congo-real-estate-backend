import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { insertListingSchema, insertPaymentSchema, insertPhoneUnlockSchema } from "./schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Utilisez JPG, JPEG ou PNG.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const express = await import('express');
  app.use('/uploads', express.static('uploads'));

  app.post('/api/listings', upload.array('images', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Au moins une image est requise' });
      }

      const imagePaths = files.map(file => `/uploads/${file.filename}`);

      const listingData = {
        ...req.body,
        rooms: parseInt(req.body.rooms),
        price: parseInt(req.body.price),
        deposit: req.body.deposit ? parseInt(req.body.deposit) : undefined,
        images: imagePaths,
      };

      const validatedData = insertListingSchema.parse(listingData);
      const listing = await storage.createListing(validatedData);

      const payment = await storage.createPayment({
        listingId: listing.id,
        type: 'publish',
        amount: 1500,
      });

      res.json({ listing, payment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error('Error creating listing:', error);
      res.status(500).json({ error: 'Erreur lors de la création de l\'annonce' });
    }
  });

  app.get('/api/listings', async (req, res) => {
    try {
      const listings = await storage.getApprovedListings();
      res.json(listings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
    }
  });

  app.get('/api/listings/:id', async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
      }
      res.json(listing);
    } catch (error) {
      console.error('Error fetching listing:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'annonce' });
    }
  });

  app.post('/api/phone-unlock', async (req, res) => {
    try {
      const validatedData = insertPhoneUnlockSchema.parse(req.body);
      const unlock = await storage.createPhoneUnlock(validatedData);

      const payment = await storage.createPayment({
        type: 'unlock',
        amount: 2500,
      });

      res.json({ unlock, payment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error('Error creating phone unlock:', error);
      res.status(500).json({ error: 'Erreur lors du déblocage du numéro' });
    }
  });

  app.post('/api/payments/:id/confirm', async (req, res) => {
    try {
      const payment = await storage.updatePaymentStatus(req.params.id, 'confirmed');
      if (!payment) {
        return res.status(404).json({ error: 'Paiement non trouvé' });
      }

      if (payment.listingId && payment.type === 'publish') {
        await storage.updateListingPaymentStatus(payment.listingId, 'confirmed');
      }

      res.json(payment);
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ error: 'Erreur lors de la confirmation du paiement' });
    }
  });

  app.get('/api/admin/listings/pending', async (req, res) => {
    try {
      const listings = await storage.getPendingListings();
      res.json(listings);
    } catch (error) {
      console.error('Error fetching pending listings:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des annonces en attente' });
    }
  });

  app.get('/api/admin/listings/all', async (req, res) => {
    try {
      const listings = await storage.getAllListings();
      res.json(listings);
    } catch (error) {
      console.error('Error fetching all listings:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
    }
  });

  app.post('/api/admin/listings/:id/approve', async (req, res) => {
    try {
      const listing = await storage.updateListingStatus(req.params.id, 'approved');
      if (!listing) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
      }
      res.json(listing);
    } catch (error) {
      console.error('Error approving listing:', error);
      res.status(500).json({ error: 'Erreur lors de l\'approbation de l\'annonce' });
    }
  });

  app.post('/api/admin/listings/:id/reject', async (req, res) => {
    try {
      const listing = await storage.updateListingStatus(req.params.id, 'rejected');
      if (!listing) {
        return res.status(404).json({ error: 'Annonce non trouvée' });
      }
      res.json(listing);
    } catch (error) {
      console.error('Error rejecting listing:', error);
      res.status(500).json({ error: 'Erreur lors du rejet de l\'annonce' });
    }
  });

  app.post('/api/admin/listings/approve-all', async (req, res) => {
    try {
      const count = await storage.approveAllPendingListings();
      res.json({ count, message: `${count} annonce(s) approuvée(s)` });
    } catch (error) {
      console.error('Error approving all listings:', error);
      res.status(500).json({ error: 'Erreur lors de l\'approbation des annonces' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
